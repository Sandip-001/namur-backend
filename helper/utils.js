function generateAdUID() {
  const random = Math.floor(100000 + Math.random() * 900000); // 6-digit random
  return `AD-${random}`;
}

module.exports = { generateAdUID };