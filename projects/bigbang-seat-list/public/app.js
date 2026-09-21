const $ = (id) => document.getElementById(id);
let data, selected;
function node(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
function render() {
  const dates = [...new Set(data.records.map(r => r.date))].sort();
  if (!dates.includes(selected)) selected = dates[0];
  $('dates').replaceChildren(...dates.map(date => {
    const items = data.records.filter(r => r.date === date);
    const button = document.createElement('button');
    button.setAttribute('aria-pressed', String(date === selected));
    button.setAttribute('aria-label', `${date}，${items.length} 筆`);
    const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'long', timeZone: 'UTC' }).format(new Date(date));
    button.append(node('span', `${date.slice(0,4)} / ${weekday}`), node('strong', date.slice(5).replace('-', '.')), node('span', `${items.length} 筆群友紀錄`));
    button.onclick = () => { selected = date; render(); };
    return button;
  }));
  const records = data.records.filter(r => r.date === selected);
  $('selected').textContent = `${selected.replaceAll('-', '/')} 名單`;
  $('count').textContent = `${records.length} 筆 / 全部 ${data.records.length} 筆`;
  $('rows').replaceChildren(...records.map((r, i) => {
    const tr = document.createElement('tr');
    for (const value of [String(i + 1).padStart(3, '0'), r.name || '未填寫']) tr.append(node('td', value));
    return tr;
  }));
  $('status').textContent = `資料擷取：${new Date(data.updatedAt).toLocaleString('zh-TW')} · 依來源日期分組，共 ${dates.length} 天`;
}
async function load(refresh = false) {
  $('refresh').disabled = true;
  if(refresh) $('status').textContent = '正在從 Google 試算表抓取完整名單…';
  try {
    const response = await fetch(refresh ? '/api/refresh' : '/api/seats', refresh ? { method: 'POST', headers: {'X-Local-Refresh':'1'} } : {});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '讀取失敗');
    data = result; render();
  } catch (error) { $('status').textContent = error.message; }
  finally { $('refresh').disabled = false; }
}
$('refresh').onclick = () => load(true);
async function initialize() {
  // Show the saved list promptly, then fetch the current Google Sheets data.
  await load();
  await load(true);
}
initialize();
