const csv = require('csv-parser')
const fs = require('fs')
const { unnest, keys, concat } = require('ramda');

const articles = {};
const journals = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/jornalsandtitle.csv')
  .pipe(csv())
  .on('data', (data) => {
    const journalName = data.SO;
    if (!journals[journalName]) {
      journal = {
        id: nextId(),
        name: journalName,
        articles: [data.PMID]
      }
      journals[journalName] = journal;
    } else {
      journals[journalName].articles.push(data.PMID);
    }
    articles[data.PMID] = data;
  })
  .on('end', () => {
    let relation = [];
    fs.createReadStream('input/cites.csv')
      .pipe(csv())
      .on('data', (data) => {
        if (articles[data.article] && articles[data.cited_by]) {
          const citedJournal = journals[articles[data.article].SO].id;
          const citingJournal = journals[articles[data.cited_by].SO].id;
          const citingXCited = [citingJournal, citedJournal];
          relation.push(citingXCited);
        }
      })
      .on('end', () => {
        // const usedRelations = {};
        // const relationId = ([citing, cited]) => `${citing}x${cited}`;
        // relation = unnest(relation);
        // console.log(relation);
        // relation = relation.filter(rel => {
        //   const relId = relationId(rel);
        //   if (usedRelations[relId]) {
        //     return false;
        //   }
        //   usedRelations[relId] = true;
        //   return true;
        // });
        const journalsNames = keys(journals);

        const networkFile = (
`*Vertices ${journalsNames.length}
${journalsNames.map((name) => `${journals[name].id} "${name}"\n`).reduce(concat)}
*Arcs
${relation.map(([citing, cited]) => `${citing} ${cited}\n`).reduce(concat, '')}*Edges`
        );
        fs.writeFileSync('output/journal_network.net', networkFile);
      });
  });