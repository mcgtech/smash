export default class Payee
{
    constructor(id, name,)
    {
        this.aid = id
        this.aname = name
    }
      get id() {
        return this.aid;
      }
      get name() {
        return this.aname;
      }
      set name(name) {
        this.aname = name
      }
}