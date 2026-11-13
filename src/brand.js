'use strict';
// Nome do programa em um único lugar. Para renomear, defina PROGRAM_NAME no ambiente.
const NAME = (process.env.PROGRAM_NAME || '').trim() || 'Talentos ONIA';
const SLUG = NAME.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'programa';

module.exports = { NAME, SLUG };
