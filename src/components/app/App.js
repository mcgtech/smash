import React, {Component} from 'react'
import BudgetContainer, {BudgetList} from '../account/budget'
// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
// https://github.com/manifoldco/definitely-not-a-todo-list
import PouchDB from 'pouchdb-browser'
import { BUD_COUCH_URL, BUD_DB} from "../../constants";
import {CCYDropDown} from "../../utils/ccy";
const db = new PouchDB(BUD_DB); // creates a database or opens an existing one

// Note: if not syncing then ensure cors is enabled in fauxton: http://127.0.0.1:5984/_utils/#_config/nonode@nohost/cors

// TODO: make this production proof
db.sync(BUD_COUCH_URL, {
  live: true,
  retry: true
}).on('change', function (info) {
    console.log('change')
}).on('paused', function (err) {
  // replication paused (e.g. replication up to date, user went offline)
    console.log('paused')
}).on('active', function () {
  // replicate resumed (e.g. new changes replicating, user went back online)
    console.log('active')
}).on('denied', function (err) {
  // a document failed to replicate (e.g. due to permissions)
    console.log('denied')
}).on('complete', function (info) {
  // handle complete
    console.log('complete')
}).on('error', function (err) {
  // handle error
    console.log('error')
    console.log(err)
});
// const db = new PouchDB('smash');
// const remoteDatabase = new PouchDB(`${COUCH_URL}/${BUD_DB}`);
// PouchDB.sync(db, remoteDatabase, {
//     live: true,
//     heartbeat: false,
//     timeout: false,
//     retry: true
// })
//     // TODO: remove?
//                 .on('complete', function (changes) {
//                   // yay, we're in sync!
//                     console.log("sync complete");
//                 }).on('change', function (change) {
//                     // yo, something changed!
//                     console.log("sync change");
//                 }).on('paused', function (info) {
//                   // replication was paused, usually because of a lost connection
//                     console.log("sync pause");
//                     console.log(info);
//                 }).on('active', function (info) {
//                   // replication was resumed
//                     console.log("sync active");
//                 }).on('error', function (err) {
//                   // boo, we hit an error!
//                     console.log("sync error");
//                   alert("data was not replicated to server, error - " + err);
//             });

// TODO: read the react redux tutorial
// Updating documents correctly - https://pouchdb.com/guides/documents.html#updating-documents%E2%80%93correctly
// https://github.com/FortAwesome/react-fontawesome#installation
// couchdb best practices: https://github.com/jo/couchdb-best-practices
// promises: https://blog.bitsrc.io/understanding-promises-in-javascript-c5248de9ff8f
// https://medium.com/@Charles_Stover/optimal-file-structure-for-react-applications-f3e35ad0a145
// https://www.codecademy.com/search?query=reactjs
// https://www.codecademy.com/articles/how-to-create-a-react-app
// https://www.taniarascia.com/getting-started-with-react/
// https://stories.jotform.com/7-reasons-why-you-should-use-react-ad420c634247#.skkxdv33n
// https://stories.jotform.com/offline-first-web-applications-d2d321444510
// https://www.valentinog.com/blog/redux/
// https://reactstrap.github.io/
// https://www.npmjs.com/package/react-datepicker
// https://github.com/algm/reactstrap-confirm
// https://www.npmjs.com/package/react-number-format
// https://blog.logrocket.com/a-guide-to-usestate-in-react-ecb9952e406c/
// https://medium.com/the-andela-way/react-drag-and-drop-7411d14894b9
// https://codepen.io/lopis/pen/XYgRKz
// https://react-select.com/home#getting-started and https://github.com/jedwatson/react-select
// no need to declare state or bind methods in constructor: https://hackernoon.com/the-constructor-is-dead-long-live-the-constructor-c10871bea599
// . you should use functional components if you are writing a presentational component which doesn’t have its own state
// or needs to access a lifecycle hook
// . you generally want to avoid changing the DOM directly when using react
// files: generally, reusable components go into their own files whereas components that are dependent on each other
//        for a specific purpose go in the same file
class App extends Component {

    render() {
        return (
            <BudgetContainer db={db}/>
            // <CCYDropDown/>
        )
    }
}


export default App