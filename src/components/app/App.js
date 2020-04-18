import React, {Component} from 'react'
import BudgetContainer from '../account/budget'

// https://www.manifold.co/blog/building-an-offline-first-app-with-react-and-couchdb
// https://github.com/manifoldco/definitely-not-a-todo-list
import PouchDB from 'pouchdb-browser'
import { COUCH_URL, BUD_DB} from "../../constants";
// https://stackoverflow.com/questions/48186831/pouchdb-find-is-not-a-function
import PouchdbFind from 'pouchdb-find';
PouchDB.plugin(PouchdbFind);
const db = new PouchDB('reading_lists');
// TODO: enable this
const remoteDatabase = new PouchDB(`${COUCH_URL}/${BUD_DB}`);
PouchDB.sync(db, remoteDatabase, {
    live: true,
    heartbeat: false,
    timeout: false,
    retry: true
});

// TODO: read the react redux tutorial
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
        )
    }
}


export default App