/** app.js 
    fill me up with logic uwu
*/


const mknode = (n, v, inner) => {
  n = document.createElementNS("http://www.w3.org/2000/svg", n);
  for (var p in v)
    n.setAttributeNS(null, p, v[p]);
  if(inner)
    n.appendChild(inner);
  return n;
}

const updateNodes = (svg, inbound, outbound, samples, config) => {
  let sessions = {};

  const populate = (container, list) => {
    for (var key in list)
    {
      
      let session = list[key];
      let pubkey = session.remoteRC.identity;
      let rx = session.rxRateCurrent;
      let tx = session.txRateCurrent;
      if(!(pubkey in container))
      {
        container[pubkey] = { rx: 0, tx: 0, name: pubkey, ip: session.remoteAddr.split(":")[0] };
      }
      container[pubkey].rx += rx;
      container[pubkey].tx += tx;
    }
  };
  for(var link of inbound)
    populate(sessions, link.sessions.established);
  
  for(var link of outbound)
    populate(sessions, link.sessions.established);
  
  let x_pos = 10;
  let y_pos = 50;
  const width = config.width || 10;
  const height = config.heigth || window.innerHeight;

  const history = config.history || 30;
  
  const make_sample = (max, sample, scale) => {
    if(sample > 0)
    {
      return (sample / max) * scale;
    }
    return 1;
  };

  const make_rate = (rate) => {
    return Number((rate / 1024.0).toFixed(2)) + " KB/s";
  };

  const appendSample = (key, tx, rx) => {
    if(!(key in samples))
    {
      samples[key] = [];
      for(var idx = 0; idx < history; idx++)
        samples[key].push([0,0]);
    }
    samples[key].push([tx, rx]);
    while(samples[key].length >= history)
    {
      samples[key] = samples[key].slice(1);
    }
  };

  let k = [];
  for(var key in sessions)
  {
    k.push(key);
  }
  k = k.sort();
  for(var key of k)
  {
    let session = sessions[key];
    appendSample(key, session.tx, session.rx);
  }

  const drawSessionGraph = (session, samps, start_x_pos, start_y_pos, h) => {
    let max_tx = 0;
    let max_rx = 0;
    for(var samp of samps)
    {
      if(samp[0] > max_tx)
        max_tx = samp[0];
      if(samp[1] > max_rx)
        max_rx = samp[1];
         
    }
    h = h / 2;
    const start_x = start_x_pos;
    const start_y = start_y_pos;
    start_y_pos += h * 2;

    const start_tx = `M ${start_x+width},${start_y}`;
    const start_rx = `M ${start_x+width},${start_y}`;
    let tx_path = start_tx;
    let rx_path = start_rx;
    let index = 0;
    const make_segment = (width, mag) => {
      return ` l ${width},${mag}`
    };
    let last_tx = 0;
    let last_rx = 0;

    let max_samp = (max_rx > max_tx ? max_rx : max_tx);
    
    for(var samp of samps)
    {
      const tx_h = make_sample(max_samp, samp[0], h);
      const rx_h = make_sample(max_samp, samp[1], h);
      tx_path += make_segment(width ,tx_h - last_tx);
      rx_path += make_segment(width ,rx_h - last_rx);
      last_tx = tx_h;
      last_rx = rx_h;
      // svg.appendChild(mknode("rect", {x: start_x_pos, y: (start_y_pos - tx_h), width: width, height: tx_h, fill: config.txcolor}));
      // svg.appendChild(mknode("rect", {x: start_x_pos, y: start_y_pos, width: width, height: rx_h, fill: config.rxcolor}));
    }
    tx_path += ` l ${width},${0-last_tx} ${start_tx} z`;
    rx_path += ` l ${width},${0-last_rx} ${start_rx} z`;
    console.log(tx_path, rx_path);
    svg.appendChild(mknode("path", {stroke: config.txcolor, fill: config.txcolor, d: tx_path, style:"fill-opacity: 0.75"}));
    svg.appendChild(mknode("path", {stroke: config.rxcolor, fill: config.rxcolor, d: rx_path, style:"fill-opacity: 0.75"}));
    svg.appendChild(mknode("text", {x: start_x, y: start_y}, document.createTextNode(session.ip)));
    svg.appendChild(mknode("text", {x: start_x, y: start_y + 50}, document.createTextNode("tx: "+make_rate(session.tx))));
    svg.appendChild(mknode("text", {x: start_x, y: start_y + 30}, document.createTextNode("rx: "+make_rate(session.rx))));
  };
  
  const h = height / ( Object.keys(sessions).length +  1);
  for(var key in samples)
  {
    console.log('draw '+key);
    if(key in sessions)
    {
      drawSessionGraph(sessions[key], samples[key], x_pos, y_pos, h);
      y_pos += h + 20;
    }
  }
  
  
};

const createApp = () => {
  let samples = {};
  let root = document.getElementById("root");
  let config = {width: 20, history: 60, txcolor: "#0ef", rxcolor: "#d3f"};
  config.history = Math.floor(window.innerWidth / config.width);
  return (data) => {
    let svg = mknode("svg", {id: "graph", version: "1.1", viewBox: "0 0 "+window.innerWidth+" "+window.innerHeight});
    updateNodes(svg, data.inbound, data.outbound, samples, config);
    const old = document.getElementById("graph");
    if(old) old.remove();
    root.appendChild(svg);
  };
};
