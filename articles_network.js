const csv = require('csv-parser')
const fs = require('fs')
const { unnest, keys, concat } = require('ramda');

const articles = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/jornalsandtitle.csv')
  .pipe(csv())
  .on('data', (data) => {
    data.id = nextId();
    articles[data.PMID] = data;
  })
  .on('end', () => {
    let relation = [];
    fs.createReadStream('input/cites.csv')
      .pipe(csv())
      .on('data', (data) => {
        if (articles[data.article] && articles[data.cited_by]) {
          const citedArticle = articles[data.article].id;
          const citingArticle = articles[data.cited_by].id;
          const citingXCited = [citingArticle, citedArticle];
          relation.push(citingXCited);
        }
      })
      .on('end', () => {
        const PMIDs = keys(articles);

        const networkFile = (
`*Vertices ${PMIDs.length}
${PMIDs.map(pmid => `${articles[pmid].id} "${articles[pmid].TI.replace(/["\n]/g, '').substring(0, 100)}"\n`).reduce(concat)}
*Arcs
${relation.map(([citing, cited]) => `${citing} ${cited}\n`).reduce(concat, '')}*Edges`
        );
        fs.writeFileSync('output/articles_network.net', networkFile);
      });
  });