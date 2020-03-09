function(doc) {
    if (doc.type == "bud") {
        emit([doc._id, 0], null);
    } else if (doc.type == "acc") {
        emit([doc.bud, 1], null);
    }
}