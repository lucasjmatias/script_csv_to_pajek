const csv = require('csv-parser')
const fs = require('fs')
const { unnest, keys, concat, uniqBy, sortBy } = require('ramda');

const articles = {};
const authors = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/pubmed_filtrado_humanos_enriquecido_QoL.csv')
  .pipe(csv({ separator: '\t' }))
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
        const article = articles[data.article];
        const citingArticle = articles[data.cited_by]
        if (article && citingArticle) {
          const citingAuthorsNumber = citingArticle.AU_QTDE;
          const JCR = citingArticle.JCR_IMPACT_FACTOR || 0;
          const weight = (JCR / citingAuthorsNumber).toFixed(2);

          const citingXCited = unnest(
            article
            .authors
            .map(citedAuthor => {
              return citingArticle
                      .authors
                      .map(citingAuthor => {
                        return [citingAuthor.id, citedAuthor.id, weight];
                      })
            })
            
          );
          relation.push(citingXCited);
          cites.push(data)
        }
      })
      .on('end', () => {
        // const usedRelations = {};
        // const relationId = ([citing, cited]) => `${citing}x${cited}`;
        relation = unnest(relation);
        // relation = relation.filter(rel => {
        //   const relId = relationId(rel);
        //   if (usedRelations[relId]) {
        //     return false;
        //   }
        //   usedRelations[relId] = true;
        //   return true;
        // });
        const authorsNames = keys(authors);

        const networkFile = (
`*Vertices ${authorsNames.length}
${authorsNames.map((name) => `${authors[name].id} "${name}"\n`).reduce(concat)}
*Arcs
${relation.map(([citing, cited, weight]) => `${citing} ${cited} ${weight}\n`).reduce(concat, '')}*Edges`
);
        fs.writeFileSync('output/network.net', networkFile);
      });
  });