require("dotenv").config()
const express = require('express');
const cors = require('cors');
const qs = require("querystring")
const dns = require("dns");
const mongoose = require("mongoose");
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (e) {
    console.log("ERROR: " + e);
    process.exit(1);
  }
}
start();

const urlSchema = mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
})
const urlModel = mongoose.model("url", urlSchema);

app.get('/', function(_, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post("/api/shorturl", (req, res) => {
  let data = [];
  req.on("data", (chunk) => {
    data.push(chunk);
  }).on("end", () => {
    data = Buffer.concat(data).toString();
    var dataObj = qs.parse(data);
    dns.lookup(dataObj["url"].replace("https://", ""), (err) => {
      if (err) res.json({ error: "invalid url" });
      else {
        urlModel.findOne({ original_url: dataObj["url"] })
          .select("original_url short_url -_id")
          .exec()
          .then((d) => {
            if (d) {
              res.json(d);
            } else {
              urlModel.findOne()
                .sort("-short_url")
                .exec()
                .then((found) => {
                  if (!found) {
                    urlModel.create({
                      original_url: dataObj["url"],
                      short_url: 1
                    });
                  } else {
                    let current_short_url = found["short_url"];
                    current_short_url += 1;
                    const doc = new urlModel({
                      original_url: dataObj["url"],
                      short_url: current_short_url
                    });
                    doc.save();
                    res.json({
                      original_url: doc["original_url"],
                      short_url: doc["short_url"]
                    });
                  };
                });
            };
          })
          .catch(() => {
            res.json({ error: "Unexpected error" });
          });
      };
    });
  });
});

app.get("/api/shorturl/:short_url?", (req, res) => {
  urlModel.findOne({ short_url: req.params.short_url })
    .select("original_url")
    .exec()
    .then((f) => {
      if (f) res.redirect(f["original_url"]);
      else {
        res.json({
          error: "No short URL found for the given input"
        })
      }
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
