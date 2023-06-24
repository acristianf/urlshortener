require("dotenv").config()
const express = require('express');
const cors = require('cors');
const urlparser = require("url");
const dns = require("dns");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("urlshortener");
const urls = db.collection("urls");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(_, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post("/api/shorturl", (req, res) => {
  console.log(req.body);
  const url = req.body.url;
  dns.lookup(new urlparser.URL(url).host,
    async (_, address) => {
      if (!address) res.json({ error: "Invalid URL" });
      else {
        const urlCount = await urls.countDocuments({});
        const urlDoc = {
          url: url,
          short_url: urlCount
        }
        const result = await urls.insertOne(urlDoc);
        console.log(result);
        res.json({ original_url: url, short_url: urlCount });
      }
    })
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = req.params.short_url;
  await urls.findOne({ short_url: +shorturl })
    .then((doc) => {
      res.redirect(doc["url"]);
    })
    .catch(() => {
      res.json({ error: "No short URL found for the given input" });
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
