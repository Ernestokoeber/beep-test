window.BT = window.BT || {};
BT.notes = {
  renderList: target => BT.libraryPages.render(target, 'notes'),
  renderDetail: (target, path) => BT.libraryPages.render(target, 'notes', path)
};
