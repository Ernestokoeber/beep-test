export function filterWorkspaceForRole(data, role) {
  const copy = JSON.parse(JSON.stringify(data || {}));
  if (role === 'viewer') {
    copy.tactics = Array.isArray(copy.tactics) ? copy.tactics.filter(tactic => tactic?.published === true) : [];
    if (copy.settings && typeof copy.settings === 'object') delete copy.settings.tacticsBoardDraft;
    delete copy.developmentFindings;
    delete copy.developmentImportReceipts;
  }
  return copy;
}

export function hasValidTacticsShape(data) {
  return data?.tactics === undefined || Array.isArray(data.tactics);
}

export function hasValidDevelopmentShape(data) {
  return (data?.developmentFindings === undefined || Array.isArray(data.developmentFindings))
    && (data?.developmentImportReceipts === undefined || Array.isArray(data.developmentImportReceipts));
}
