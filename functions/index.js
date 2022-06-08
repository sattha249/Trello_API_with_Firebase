const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();
const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");
const csv = require("csv-writer");
const os = require("os");
const tmpdir = os.tmpdir();

const admin = require("firebase-admin");
require("dotenv").config();
admin.initializeApp();



const key = process.env.API_KEY;
const token = process.env.SECRET_API;
const keyId = process.env.ACCESS_KEY;
const secret = process.env.SECRET_KEY;
var id = "DP7O6uW5"; // board id
var card_id = "v2hNam6G";
const group = `?key=${key}&token=${token}`;
const BUCKET_NAME = "trelloapi";
const createCsvWriter = csv.createObjectCsvWriter;
var memberId = "satthak";

const s3 = new AWS.S3({
  accessKeyId: keyId,
  secretAccessKey: secret,
});

const field = `https://api.trello.com/1/boards/${id}/name${group}`; // show field on a board can change paremeters   /
const board_actions = `https://api.trello.com/1/boards/${id}/actions${group}`; // show action in board            /
const members = `https://api.trello.com/1/boards/${id}/members${group}`; // show board member username and fullname  /
const memberIncard = `https://api.trello.com/1/members/${memberId}${group}`;
const member_info = `https://api.trello.com/1/boards/${id}/memberships${group}`; // show board member type and status    / no use
const checklist = `https://api.trello.com/1/boards/${id}/checklists${group}`; // show checklist                  / no use
const list = `https://api.trello.com/1/boards/${id}/lists${group}`; // show listname and status                     /
const list_filter = `https://api.trello.com/1/boards/${id}/lists/open${group}`; // show list name by fillter (in parameters)   / no use
const card_actions = `https://api.trello.com/1/cards/${card_id}/actions${group}`; //card action (identify by card id)    /
const card_attach = `https://api.trello.com/1/cards/${card_id}/attachments${group}`; // attach file in card
const all_card = `https://api.trello.com/1/boards/${id}/cards/all${group}`; // attach file in card
const all_board = `https://api.trello.com/1/members/${memberId}/boards${group}`; // all board by member id

async function uploadFile(file, filename) {
  const fileContent = fs.readFileSync(file);
  const params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: fileContent,
  };
  await s3.upload(params, function (err, data) {
    if (err) throw err;
    else functions.logger.info("File Uploaded", { structuredData: true });
  });
}

// Health check
app.get("/", async (req, res) => {
  res.send("Welcome to trello api");
});

// board filter
app.get("/boards/:id", async (req, res) => {
  id = req.params["id"];
  const board_info = `https://api.trello.com/1/boards/${id}/${group}`;
  const member = await getinfo(members);
  board = await getinfo(board_info);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, `boards_${board.name}.csv`),
    header: [
      { id: "name", title: "BOARDNAME" },
      { id: "desc", title: "DESCRIPTION" },
      { id: "status", title: "STATUS" },
      { id: "url", title: "URL" },
      { id: "lastactivity", title: "LAST_ACTIVITY" },
      { id: "lastview", title: "LAST_VIEW" },
      { id: "creator", title: "CREATOR" },
    ],
  });
  const records = [];
  var boardName = board.name;
  var boardDesc = board.descData;
  var status = board.closed ? "closed" : "open";
  var url = board.url;
  var lastactivity = board.dateLastActivity;
  var lastView = board.dateLastView;
  var name = board.idMemberCreator;
  member.forEach((member) => {
    if (member.id == board.idMemberCreator) {
      name = member.fullName;
    }
  });
  records.push({
    name: boardName,
    desc: boardDesc,
    status: status,
    url: url,
    lastactivity: lastactivity,
    lastview: lastView,
    creator: name,
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(
    path.join(tmpdir, `boards_${board.name}.csv`),
    `boards_${board.name}.csv`
  );
  res.send(records);
});

//board
app.get("/boards", async (req, res) => {
  const member = await getinfo(members);
  data = await getinfo(all_board);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, "boards.csv"),
    header: [
      { id: "name", title: "BOARDNAME" },
      { id: "desc", title: "DESCRIPTION" },
      { id: "status", title: "STATUS" },
      { id: "url", title: "URL" },
      { id: "lastactivity", title: "LAST_ACTIVITY" },
      { id: "lastview", title: "LAST_VIEW" },
      { id: "creator", title: "CREATOR" },
    ],
  });
  const records = [];
  data.forEach((board) => {
    var boardName = board.name;
    var boardDesc = board.descData;
    var status = board.closed ? "closed" : "open";
    var url = board.url;
    var lastactivity = board.dateLastActivity;
    var lastView = board.dateLastView;
    var name = board.idMemberCreator;
    member.forEach((member) => {
      if (member.id == board.idMemberCreator) {
        name = member.fullName;
      }
    });
    records.push({
      name: boardName,
      desc: boardDesc,
      status: status,
      url: url,
      lastactivity: lastactivity,
      lastview: lastView,
      creator: name,
    });
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, "boards.csv"), `boards.csv`);
  res.send(records);
});

//member by id
app.get("/members/:id", async (req, res) => {
  id = req.params["id"];
  const member_info = `https://api.trello.com/1/boards/${id}/memberships${group}`;
  const members = `https://api.trello.com/1/boards/${id}/members${group}`;
  data = await getinfo(member_info);
  member = await getinfo(members);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, `members_${id}.csv`),
    header: [
      { id: "fullname", title: "FULLNAME" },
      { id: "username", title: "USERNAME" },
    ],
  });
  const records = [];
  data.forEach((data) => {
    var name;
    var username;
    member.forEach((member) => {
      if (data.idMember == member.id) {
        name = member.fullName;
        username = member.username;
      }
    });
    records.push({ fullname: name, username: username, Type: data.memberType });
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, `members_${id}.csv`), `members_${id}.csv`);
  res.send(records);
});

//member at board
app.get("/members", async (req, res) => {
  data = await getinfo(members);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, "members.csv"),
    header: [
      { id: "fullname", title: "FULLNAME" },
      { id: "username", title: "USERNAME" },
    ],
  });
  const records = [];
  data.forEach((member) => {
    records.push({ fullname: member.fullName, username: member.username });
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, "members.csv"), `members.csv`);
  res.send(records);
});

//get attachment by card id
app.get("/attachs/:id", async (req, res) => {
  card_id = req.params["id"];
  const card_attach = `https://api.trello.com/1/cards/${card_id}/attachments${group}`;
  data = await getinfo(card_attach);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, `attachments_${card_id}.csv`),
    header: [
      { id: "date", title: "DATE" },
      { id: "filename", title: "FILENAME" },
      { id: "url", title: "URL" },
    ],
  });
  const records = [];
  data.forEach((file) => {
    records.push({ date: file.date, filename: file.name, url: file.url });
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(
    path.join(tmpdir, `attachments_${card_id}.csv`),
    `attachments_${card_id}.csv`
  );
  res.send(records);
});

//find card by board id
app.get("/cards/:id", async (req, res) => {
  id = req.params["id"];
  const all_card = `https://api.trello.com/1/boards/${id}/cards/all${group}`;
  member = await getinfo(members);
  data = await getinfo(all_card);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, `cards_${id}.csv`),
    header: [
      { id: "name", title: "NAME" },
      { id: "start", title: "START" },
      { id: "due", title: "DUE" },
      { id: "member", title: "MEMBER" },
      { id: "label_name", title: "LABEL_NAME" },
      { id: "label_color", title: "LABEL_COLOR" },
    ],
  });
  const records = [];
  data.forEach((card) => {
    var start = card.badges.start == null ? "no start date assign" : card.badges.start;
    var due = card.badges.due == null ? "no due date assign" : card.badges.due;
    var members = [];
    if (card.idMembers.length > 0) {
      card.idMembers.forEach((id) => {
        member.forEach((member) => {
          if (member.id == id) {
            members.push(member.fullName);
          }
        });
      });
    }
    //label
    if (card.labels.length > 0) {
      var name = [];
      var color = [];
      card.labels.forEach((label) => {
        name.push(label.name);
        color.push(label.color);
      });
      console.log("label name : ", name);
      console.log("label color : ", color);
    } else {
      console.log("no label name");
      var name = "no label name";
      console.log("no label color");
      var color = "no label color";
    }

    try {
      records.push({
        name: card.name,
        start: start,
        due: due,
        member: members,
        label_name: name,
        label_color: color,
      });
    } catch {
      console.log("push error");
    }
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, `cards_${id}.csv`), `cards_${id}.csv`);
  res.send(records);
});

//card
app.get("/cards", async (req, res) => {
  member = await getinfo(members);
  data = await getinfo(all_card);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, "cards.csv"),
    header: [
      { id: "name", title: "NAME" },
      { id: "start", title: "START" },
      { id: "due", title: "DUE" },
      { id: "member", title: "MEMBER" },
      { id: "label_name", title: "LABEL_NAME" },
      { id: "label_color", title: "LABEL_COLOR" },
    ],
  });
  const records = [];
  data.forEach((card) => {
    var start =
      card.badges.start == null ? "no start date assign" : card.badges.start;
    var due = card.badges.due == null ? "no due date assign" : card.badges.due;
    var members = [];
    if (card.idMembers.length > 0) {
      card.idMembers.forEach((id) => {
        member.forEach((member) => {
          if (member.id == id) {
            members.push(member.fullName);
          }
        });
      });
    }
    //label
    if (card.labels.length > 0) {
      var name = [];
      var color = [];
      card.labels.forEach((label) => {
        name.push(label.name);
        color.push(label.color);
      });
      console.log("label name : ", name);
      console.log("label color : ", color);
    } else {
      console.log("no label name");
      var name = "no label name";
      console.log("no label color");
      var color = "no label color";
    }

    try {
      records.push({
        name: card.name,
        start: start,
        due: due,
        member: members,
        label_name: name,
        label_color: color,
      });
    } catch {
      console.log("push error");
    }
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, "cards.csv"), `cards.csv`);
  res.send(records);
});

app.get("/attachs", async (req, res) => {
  data = await getinfo(card_attach);
  const csvWriter = createCsvWriter({
    path: path.join(tmpdir, "attachments.csv"),
    header: [
      { id: "date", title: "DATE" },
      { id: "filename", title: "FILENAME" },
      { id: "url", title: "URL" },
    ],
  });
  const records = [];
  data.forEach((file) => {
    records.push({ date: file.date, filename: file.name, url: file.url });
  });
  await csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      functions.logger.info(records, { structuredData: true });
    });
  await uploadFile(path.join(tmpdir, "attachments.csv"), `attachments.csv`);
  res.send(records);
});

//get data from trello
async function getinfo(data) {
  return fetch(data, {
    method: "get",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      return response.text();
    })
    .then((text) => {
      return JSON.parse(text);
    })
    .catch((err) => console.error(err));
}

exports.trello = functions.https.onRequest(app);
