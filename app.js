require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const bodyParser = require("body-parser");

//I have created this module
const date = require(__dirname + "/date.js");

const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.set("view engine", "ejs");

// body parser needed to access the body of the post request
app.use(bodyParser.urlencoded({ extended: true }));

// we need to specify the name of the static folder
app.use(express.static("public"));

// create connection to mongodb

let dataBaseURL = process.env["URLDB"];

mongoose.connect(dataBaseURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//create schema for the items collection
const itemsSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "The task needs a name"],
  },
});
// now we creeate a model based on the schema that we just created
const Item = mongoose.model("item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todo list!",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

// we add this default items for each new list
const defaultItems = [item1, item2, item3];

//schema for custom lists
const listSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "The list needs a name"],
  },
  items: [itemsSchema],
});

// now we creeate a model for custom lists based on the schema for custom lists
const List = mongoose.model("List", listSchema);

// routes
// home route
app.get("/", function (req, res) {
  let day = date.getDay();

  Item.find({}, function (err, foundItems) {
    if (err) {
      console.log(err);
    } else {
      // if the defaults items were no saved then we
      // will saved them and then we will redirect to the home route again
      if (foundItems.length == 0) {
        Item.insertMany(defaultItems, function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("Tasks added Succesfully");
          }
        });
        res.redirect("/");
      } else {
        List.find({}, function (err, foundLists) {
          res.render("list", {
            listTitle: day,
            tasks: foundItems,
            lists: foundLists,
          });
        });
      }
    }
  });
});

//custom list route
app.get("/:customList", function (req, res) {
  let customListName = _.capitalize(req.params.customList);

  List.findOne({ name: customListName }, function (err, foundList) {
    if (err) {
      console.log(err);
    } else {
      if (foundList) {
        List.find({}, function (err, foundLists) {
          res.render("list", {
            listTitle: foundList.name,
            tasks: foundList.items,
            lists: foundLists,
          });
        });
      } else {
        let customList = new List({
          name: customListName,
          items: defaultItems,
        });
        customList.save();
        res.redirect("/" + customListName);
      }
    }
  });
});

app.post("/", function (req, res) {
  let day = date.getDay();
  let listName = req.body.list;
  let itemName = req.body.new_item;

  let item = new Item({
    name: itemName,
  });

  if (listName === day) {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function (req, res) {
  let taskId = req.body.checkbox;
  let listTitle = req.body.listTitle;

  let day = date.getDay();

  if (listTitle === day) {
    Item.findByIdAndRemove(taskId, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Succesfully deleted");
      }
    });
    res.redirect("/");
  } else {
    // we use $pull in order to remove an element from an array inside a document
    List.findOneAndUpdate(
      { name: listTitle },
      { $pull: { items: { _id: taskId } } },
      function (err, foundList) {
        if (!err) {
          res.redirect("/" + listTitle);
        }
      }
    );
  }
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server running on port 3000");
});
