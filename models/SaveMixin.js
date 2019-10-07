export default function (model) {
  return {
    save: async function () {
      if (!this.id) {
        await model.query().insert(this)
      } else {
        await model.query().update(this);
      }
    }
  }
}
