const csv = require('csv-parser')
const fs = require('fs')
const { unnest, keys, concat } = require('ramda');

const articles = {};
const authors = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/amostra.csv')
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
          const citedXCiting = unnest(
            articles[data.article]
            .authors
            .map(citedAuthor => {
              return articles[data.cited_by]
                      .authors
                      .map(citingAuthor => {
                        return [citedAuthor.id, citingAuthor.id];
                      })
            })
          );
          relation.push(citedXCiting);
          cites.push(data)
        }
      })
      .on('end', () => {
        relation = unnest(relation);
        const authorsNames = keys(authors);

        const networkFile = (
`*Vertices ${authorsNames.length}
${authorsNames.map((name) => `${authors[name].id} "${name}"\n`).reduce(concat)}
*Arcs
${relation.map(([cited, citing]) => `${cited} ${citing}\n`).reduce(concat)}*Edges`
);
        fs.writeFileSync('output/network.net', networkFile);
      });
  });