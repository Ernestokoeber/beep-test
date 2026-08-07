export function filterWorkspaceForRole(data, role) {
  const copy = JSON.parse(JSON.stringify(data || {}));
  if (role === 'viewer') {
    copy.tactics = Array.isArray(copy.tactics) ? copy.tactics.filter(tactic => tactic?.published === true) : [];
    if (copy.settings && typeof copy.settings === 'object') delete copy.settings.tacticsBoardDraft;
  }
  return copy;
}

export function hasValidTacticsShape(data) {
  return data?.tactics === undefined || Array.isArray(data.tactics);
}
