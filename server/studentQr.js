function parseStudentQr(payload) {
  if (typeof payload !== 'string' || !payload.trim()) return { error: 'invalid' };
  const raw = payload.trim();
  const matches = [...raw.matchAll(/(?:^|\s)([0-9]{10})(?=\s|$)/g)];
  if (!matches.length) return { error: 'studentId' };
  if (matches.length !== 1) return { error: 'invalid' };

  const match = matches[0];
  const studentId = match[1];
  const idStart = match.index + match[0].length - studentId.length;
  const name = raw.slice(0, idStart).trim().replace(/\s+/g, ' ');
  const course = raw.slice(idStart + studentId.length).trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'name' };
  if (!course) return { error: 'course' };
  if (name.length > 100 || course.length > 100) return { error: 'invalid' };

  return { student: { name, studentId, course } };
}

function verifyStudentQrSubmission(body) {
  const parsed = parseStudentQr(body && body.studentQr);
  if (parsed.error) return parsed;
  const { name, studentId, course } = parsed.student;
  const submittedName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const submittedStudentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const submittedCourse = typeof body.course === 'string' ? body.course.trim().replace(/\s+/g, ' ') : '';
  if (submittedName !== name || submittedStudentId !== studentId || submittedCourse !== course) {
    return { error: 'mismatch' };
  }
  return parsed;
}

module.exports = { parseStudentQr, verifyStudentQrSubmission };
