function parseIdentityQr(payload) {
  if (typeof payload !== 'string' || !payload.trim()) return { error: 'invalid' };
  const raw = payload.trim();
  const matches = [...raw.matchAll(/(?:^|\s)([0-9]{7}|[0-9]{10})(?=\s|$)/g)];
  if (!matches.length) return { error: 'memberId' };
  if (matches.length !== 1) return { error: 'invalid' };

  const match = matches[0];
  const memberId = match[1];
  const idStart = match.index + match[0].length - memberId.length;
  const name = raw.slice(0, idStart).trim().replace(/\s+/g, ' ');
  const affiliation = raw.slice(idStart + memberId.length).trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'name' };
  if (!affiliation) return { error: 'affiliation' };
  if (name.length > 100 || affiliation.length > 100) return { error: 'invalid' };

  return {
    identity: {
      name,
      memberId,
      memberType: memberId.length === 10 ? 'Student' : 'Faculty',
      affiliation,
    },
  };
}

function verifyIdentityQrSubmission(body) {
  const parsed = parseIdentityQr(body && (body.identityQr || body.studentQr));
  if (parsed.error) return parsed;
  const { name, memberId, memberType, affiliation } = parsed.identity;
  const submittedName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const submittedMemberId = typeof body.memberId === 'string'
    ? body.memberId.trim()
    : typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const submittedAffiliation = typeof body.affiliation === 'string'
    ? body.affiliation.trim().replace(/\s+/g, ' ')
    : typeof body.course === 'string' ? body.course.trim().replace(/\s+/g, ' ') : '';
  const submittedMemberType = body.memberType;
  if (
    submittedName !== name
    || submittedMemberId !== memberId
    || submittedAffiliation !== affiliation
    || (submittedMemberType !== undefined && submittedMemberType !== memberType)
  ) {
    return { error: 'mismatch' };
  }
  return parsed;
}

module.exports = { parseIdentityQr, verifyIdentityQrSubmission };
