const csv = require('csv-parser')
const fs = require('fs')
const { unnest, keys, concat, uniqBy, sortBy } = require('ramda');

const articles = {};
const authors = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/sample2.csv')
  .pipe(csv())
  .on('data', (data) => {
    const authorsnames = data.AF.split(';');
    data.authors = [];
    authorsnames.forEach(authorName => {
      if (!authors[authorName]) {
        authors[authorName] = {};
        authors[authorName].id = nextId();
        authors[authorName].articles = [data.PMID];
      } else {
        authors[authorName].articles.push(data.PMID);
      }
      data.authors.push(authors[authorName]);
    })
    articles[data.PMID] = data;
  })
  .on('end', () => {
    const cites = [];
    let relation = [];
    fs.createReadStream('input/cites.csv')
      .pipe(csv())
      .on('data', (data) => {
        if (articles[data.article] && articles[data.cited_by]) {
          const citingXCited = unnest(
            articles[data.article]
            .authors
            .map(citedAuthor => {
              return articles[data.cited_by]
                      .authors
                      .map(citingAuthor => {
                        return [citingAuthor.id, citedAuthor.id];
                      })
            })
          );
          relation.push(citingXCited);
          cites.push(data)
        }
      })
      .on('end', () => {
        const usedRelations = {};
        const relationId = ([citing, cited]) => `${citing}x${cited}`;
        relation = unnest(relation);
        relation = relation.filter(rel => {
          const relId = relationId(rel);
          if (usedRelations[relId]) {
            return false;
          }
          usedRelations[relId] = true;
          return true;
        });
        const authorsNames = keys(authors);

        const networkFile = (
`*Vertices ${authorsNames.length}
${authorsNames.map((name) => `${authors[name].id} "${name}"\n`).reduce(concat)}
*Arcs
${relation.map(([citing, cited]) => `${citing} ${cited}\n`).reduce(concat, '')}*Edges`
);
        fs.writeFileSync('output/network.net', networkFile);
      });
  });