/* =========================================================
   REGRAS DE NEGOCIO
   ========================================================= */

// Media = soma das notas / quantidade de materias
function media(a){
  if (!a.materias.length) return 0;
  var soma = a.materias.reduce(function(s,m){ return s + Number(m.nota||0); }, 0);
  return soma / a.materias.length;
}

// Selo do perfil pela media
function selo(m){
  if (m >= 9) return { txt:'ÓTIMO ALUNO', cls:'otimo' };
  if (m >= 7) return { txt:'BOM ALUNO',   cls:'bom' };
  if (m >= 6) return { txt:'REGULAR',     cls:'regular' };
  return             { txt:'EM RISCO',    cls:'risco' };
}

// Nivel sobe enquanto xp >= 100 * nivel; ao subir, desconta o custo
function subirNivel(a){
  var subiu = [];
  while (a.xp >= 100 * a.nivel) {
    a.xp -= 100 * a.nivel;
    a.nivel += 1;
    subiu.push(a.nivel);
  }
  return subiu;
}

// Medalhas automaticas - devolve as que acabaram de ser conquistadas
function conferirMedalhas(a){
  var novas = [];
  function dar(nome){
    if (a.medalhas.indexOf(nome) === -1) { a.medalhas.push(nome); novas.push(nome); }
  }
  if (a.materias.some(function(m){ return Number(m.nota) > 0; }))   dar('Primeira Nota');
  if (a.materias.some(function(m){ return Number(m.nota) === 10; })) dar('Nota Máxima');
  if (a.faltas === 0) dar('Sem Faltas');
  if (a.nivel >= 5)   dar('Nível 5');
  return novas;
}

/* =========================================================
   RANK E ALERTAS
   ========================================================= */

// posicao do aluno na turma, do maior para o menor media
function rank(a){
  var ord = db.alunos.slice().sort(function(x,y){ return media(y) - media(x); });
  for (var i=0;i<ord.length;i++) if (ord[i].id === a.id) return i + 1;
  return db.alunos.length;
}

// tudo que merece atencao do professor, em ordem de gravidade
function alertas(){
  var lista = [];
  db.alunos.forEach(function(a){
    if (media(a) < 6) lista.push({ id:a.id, tipo:'risco', ic:'\u{1F6A8}', txt: a.nome + ' está EM RISCO, média ' + n1(media(a)) });
  });
  db.alunos.forEach(function(a){
    if (a.faltas >= 5) lista.push({ id:a.id, tipo:'falta', ic:'\u{1F4C5}', txt: a.nome + ' já tem ' + a.faltas + ' faltas' });
  });
  db.alunos.forEach(function(a){
    a.materias.forEach(function(m){
      if (Number(m.nota) < 6) lista.push({ id:a.id, tipo:'nota', ic:'⚠️', txt: a.nome + ' está com ' + n1(m.nota) + ' em ' + m.nome });
    });
  });
  return lista;
}
