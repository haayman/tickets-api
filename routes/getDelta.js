module.exports = function(source, updated) {
  let added = updated.filter(
    updatedItem =>
      source.find(sourceItem => sourceItem.id === updatedItem.id) === undefined
  );
  let changed = source.filter(
    sourceItem =>
      updated.find(updatedItem => updatedItem.id === sourceItem.id) !==
      undefined
  );
  let deleted = source.filter(
    sourceItem =>
      updated.find(updatedItem => updatedItem.id === sourceItem.id) ===
      undefined
  );

  return {
    added: added,
    changed: changed,
    deleted: deleted
  };
};
