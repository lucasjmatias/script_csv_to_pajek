const csv = require('csv-parser')
const fs = require('fs')

const articles = [];
const authors = {};
let currId = 1;

const nextId = () => currId++;

fs.createReadStream('input/amostra.csv')
  .pipe(csv())
  .on('data', (data) => {
    const authorsnames = data.AF.split(';');
    authorsnames.forEach(authorName => {
      if (!authors[authorName]) {
        authors[authorName] = {};
        authors[authorName].id = nextId();
        authors[authorName].articles = [data.PMID];
      } else {
        authors[authorName].articles.push(data.PMID);
      }
    })
    articles.push(data)
  })
  .on('end', () => {
    console.log(authors);
  });