import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import useIsMobile from "../hooks/useIsMobile";

/* ============================================================
   Static data (plain numbers only, no three.js objects)
   ============================================================ */
// Rectangles are taken straight from the reference image's pixel coordinates (north = up).
const S = 20, H = 3.4;
const R = (a, b, c, d) => ({ x: ((a + c) / 2 - 900) / S, z: ((b + d) / 2 - 1000) / S, w: (c - a) / S, d: (d - b) / S });
const RED = 0xb5533c, MAR = 0x8e2f45, TEAL = 0x4a8f86;
const RN = { flat: "Flat roof", gable: "Gable roof", hip: "Hip roof", arc: "Arc roof" };

// ---- Technology Bldg. footprint: 12 corners, drawn in plan metres then placed on the campus ----
// TK = map units per metre, (TX0,TZ0) = where the plan's top-right of the row sits.
const TK = .63, TX0 = -9.9, TZ0 = -28.6;
const TW = ([u, v]) => [TX0 - (u + 6.5) * TK, TZ0 - v * TK];
const TRC = (u1, v1, u2, v2) => { const [a, b] = TW([u1, v1]), [c, d] = TW([u2, v2]); return { x: (a + c) / 2, z: (b + d) / 2, w: Math.abs(a - c), d: Math.abs(b - d) }; };
const TPOLY = [[0,0],[32.5,0],[29.6,17.6],[25.6,15.6],[24.6,14.4],[16.1,10.75],[10.4,21.8],[-6.35,22],[-6.35,15.7],[5.6,15.7],[5.6,9],[0,9]];

// shift in pixels: +x = east, +y = south
const LX = 0, LY = -90;
const LR = (a, b, c, d) => R(a + LX, b + LY, c + LX, d + LY);

// Factory so every scene gets fresh objects (the engine adds meshes to them)
const makeBuildings = () => [
  { name: "Administration Bldg.", floors: 3, vols: [R(500, 570, 690, 1290)], wall: "#e3b98a", roof: "flat", rc: 0xd9a877 },
  { name: "Engineering Bldg.", floors: 3, vols: [R(1140, 500, 1335, 1300)], wall: "#dfb487", roof: "flat", rc: 0xcfa06f },
  { name: "High School Bldg.", floors: 2, vols: [R(735, 690, 880, 1370)], wall: "#d9c3b0", roof: "gable", rc: MAR },
  { name: "Technology Bldg.", floors: 2, poly: TPOLY.map(TW), vols: [{ x: -22.2, z: -35.55, w: 24.6, d: 13.9 }], wall: "#d7e3df", roof: "hip", rc: MAR,
    hips: [TRC(0, 0, 32.5, 9), TRC(5.6, 9, 12, 21.5), TRC(-6.35, 15.7, 5.6, 22)],
    flats: [[[16.1, 9], [32, 9], [29.6, 17.6], [25.6, 15.6], [24.6, 14.4], [16.1, 10.75]].map(TW)],
    annex: [TRC(-2.7, 22, .9, 24.9)] },
  { name: "Criminology Building", floors: 3, vols: [R(185, 755, 490, 1145)], wall: "#d7e3df", roof: "flat", rc: TEAL },
  { name: "Elementary Bldg.", floors: 1, vols: [R(1060, 50, 1620, 215)], wall: "#e6cfae", roof: "gable", rc: MAR },
  { name: "Canteen", floors: 1, vols: [R(740, 50, 1060, 215)], wall: "#e6cfae", roof: "gable", rc: MAR },
  { name: "Machine Shop", floors: 1, vols: [R(1340, 410, 1650, 500)], wall: "#ecd9b0", roof: "flat", rc: MAR },
  { name: "Clinic", floors: 1, vols: [R(405, 1285, 595, 1580)], wall: "#ffffff", roof: "gable", rc: MAR },
  { name: "Guardhouse", floors: 1, vols: [R(930, 1880, 1090, 2000)], wall: "#e6cfae", roof: "flat", rc: MAR },
  { name: "Covered Court", floors: 1, vols: [R(205, 445, 500, 740)], roof: "arc", rc: "#808080", rise: 7, rot: true },
  { name: "Stage", floors: 1, vols: [R(945, 545, 1090, 690)], roof: "arc", rc: TEAL, rise: 4.5 },
  { name: "Martial Arts Room", floors: 1, vols: [R(735, 570, 880, 690)], wall: "#e6cfae", roof: "gable", rc: MAR },
];

// Only used to render the side list in React
const BUILDING_LIST = makeBuildings().map(({ name, floors }) => ({ name, floors }));
const GROUND_NAMES = ["Quadrangle", "Student Lounge"];
// Same order as INT inside createCampus()
const INTERIOR_OPTIONS = [
  "Administration Bldg.", "Criminology Bldg.", "Engineering Bldg.",
  "Technology Bldg.", "Canteen/Elementary Bldg.", "High School Bldg./Martial Arts Room", "Machine Shop",
];
const DEFAULT_INFO = "Click a building to see its details. Floor buttons show floors up to the one you pick.";

/* ============================================================
   three.js engine (everything imperative lives here)
   ============================================================ */
function createCampus({ mount, labelHost, onInfo, onInterior }) {
  const M = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
  function wall(col, rep) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = col; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3b5a78'; g.fillRect(12, 14, 40, 28); g.fillStyle = '#8fb4d4'; g.fillRect(12, 14, 40, 8);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 60, 64, 4);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 1); return new THREE.MeshLambertMaterial({ map: t });
  }

  // ---------- scene ----------
  const size = { w: 1, h: 1 };
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe7ee);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
  const el = renderer.domElement;
  el.style.display = 'block'; el.style.touchAction = 'none';
  mount.appendChild(el);
  const cam = new THREE.PerspectiveCamera(45, 1, .5, 600);
  const HOME = { p: new THREE.Vector3(0, 90, 105), t: new THREE.Vector3(0, 0, 5) };
  cam.position.copy(HOME.p);
  const ctl = new OrbitControls(cam, el);
  ctl.target.copy(HOME.t); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI / 2.1; ctl.minDistance = 15; ctl.maxDistance = 220;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a5a, .8));
  const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(-50, 90, 40); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 250 }); scene.add(sun);

  function box(w, h, d, mat, x, y, z, par) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (par || scene).add(m); return m;
  }
  const slab = (r, h, c, y) => box(r.w, h, r.d, M(c), r.x, y, r.z);

  // ---------- roofs ----------
  function roof(v, type, col, rise) {
    const m = M(col, { side: THREE.DoubleSide }), w = v.w + .6, d = v.d + .6; let r;
    if (type === 'hip') {
      const h = Math.min(w, d) * .32, geo = new THREE.ConeGeometry(1, h, 4); geo.rotateY(Math.PI / 4); geo.translate(0, h / 2, 0);
      r = new THREE.Mesh(geo, m); r.scale.set(w / 1.4142, 1, d / 1.4142);
    } else if (type === 'gable') {
      const z = v.d >= v.w, sp = z ? w : d, len = z ? d : w, h = sp * .3, s = new THREE.Shape();
      s.moveTo(-sp / 2, 0); s.lineTo(sp / 2, 0); s.lineTo(0, h);
      const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
      r = new THREE.Mesh(geo, m); if (!z) r.rotation.y = Math.PI / 2;
    } else if (type === 'arc') {
      const a = v.w / 2, t = .35, s = new THREE.Shape();
      s.moveTo(a, 0); s.absellipse(0, 0, a, rise, 0, Math.PI, false, 0);
      s.lineTo(-a + t, 0); s.absellipse(0, 0, a - t, rise - t, Math.PI, 0, true, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: v.d, bevelEnabled: false }); geo.translate(0, 0, -v.d / 2); r = new THREE.Mesh(geo, m);
    } else { r = new THREE.Group(); box(v.w + .5, .6, v.d + .5, m, 0, .3, 0, r); box(v.w - .7, .1, v.d - .7, M(0x8d949a), 0, .62, 0, r); } // FLAT roof + parapet
    r.traverse(n => n.castShadow = true); return r;
  }

  // ---------- labels (DOM elements inside the component, not document.body) ----------
  const labels = []; let showL = true;
  function label(t, p, o) {
    const d = document.createElement('div'); d.className = 'cmap-lbl'; d.textContent = t; labelHost.appendChild(d);
    labels.push({ el: d, p: p.clone(), o });
  }

  // ---------- buildings ----------
  function building(o) {
    const g = new THREE.Group(); o.parts = []; o.g = g; scene.add(g);
    if (o.poly) { // ---- free-form footprint (Technology Bldg.): floors are extruded from the polygon ----
      const sh = new THREE.Shape(o.poly.map(([x, z]) => new THREE.Vector2(x, -z))), sm = wall(o.wall, 1), cap = M(0xcfc8bd);
      sm.map.repeat.set(1 / 3.2, 1 / H);
      for (let f = 0; f < o.floors; f++) {
        const geo = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, [cap, sm]); m.position.y = f * H; m.castShadow = m.receiveShadow = true; g.add(m); m.userData.need = f + 1; o.parts.push(m);
      }
      (o.hips || []).forEach(v => { const r = roof(v, 'hip', o.rc); r.position.set(v.x, o.floors * H, v.z); g.add(r); r.userData.need = o.floors; r.userData.isRoof = 1; o.parts.push(r); });
      (o.flats || []).forEach(pl => {
        const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pl.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: .5, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2); const r = new THREE.Mesh(geo, M(o.rc, { side: THREE.DoubleSide })); r.position.y = o.floors * H; r.castShadow = true;
        g.add(r); r.userData.need = o.floors; r.userData.isRoof = 1; o.parts.push(r);
      });
      (o.annex || []).forEach(v => {
        const m = box(v.w, H, v.d, wall(o.wall, 2), v.x, H / 2, v.z, g); m.userData.need = 1; o.parts.push(m);
        const r = roof(v, 'flat', o.rc); r.position.set(v.x, H, v.z); g.add(r); r.userData.need = 1; r.userData.isRoof = 1; o.parts.push(r);
      });
    } else o.vols.forEach(v => {
      if (o.roof === 'arc') {
        const s = box(v.w, .5, v.d, M(0xcfd6d4), v.x, .25, v.z, g); s.userData.need = 1; o.parts.push(s);
        const rv = o.rot ? { w: v.d, d: v.w } : v;            // swap span and length when rotated
        const r = roof(rv, 'arc', o.rc, o.rise);
        if (o.rot) r.rotation.y = Math.PI / 2;                // turn the arch 90°
        r.position.set(v.x, .5, v.z); g.add(r); r.userData.need = 1; r.userData.isRoof = 1; o.parts.push(r); return;
      }
      const mx = wall(o.wall, Math.max(1, Math.round(v.d / 3.2))), mz = wall(o.wall, Math.max(1, Math.round(v.w / 3.2))), top = M(0xcfc8bd);
      for (let f = 0; f < o.floors; f++) {
        const m = box(v.w, H, v.d, [mx, mx, top, top, mz, mz], v.x, f * H + H / 2, v.z, g); m.userData.need = f + 1; o.parts.push(m);
      }
      const r = roof(v, o.roof, o.rc); r.position.set(v.x, o.floors * H, v.z); g.add(r); r.userData.need = o.floors; r.userData.isRoof = 1; o.parts.push(r);
    });
    const v = o.vols[0]; o.p = new THREE.Vector3(v.x, 0, v.z); o.top = o.roof === 'arc' ? o.rise + .5 : o.floors * H;
    g.traverse(n => n.userData.b = o); label(o.name, o.p, o);
  }

  const B = makeBuildings();

  // ---------- grounds ----------
  [R(150, 30, 1650, 1300), R(380, 1290, 880, 1660), R(860, 1290, 1130, 2010)].forEach(r => slab(r, .4, 0x86a860, -.2)); // grass
  slab(R(600, 470, 1130, 1480), .12, 0xd5d3ce, .06);   // Quadrangle
  slab(R(880, 1480, 1000, 1900), .12, 0xd5d3ce, .06);  // path to guardhouse
  slab(LR(760, 305, 1065, 405), .1, 0xa8bf86, .05);    // Student Lounge area
  B.forEach(building);
  function pav(r) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.3, 2.6, .3, M(0x7a5c3e), r.x + a * (r.w / 2 - .4), 1.3, r.z + b * (r.d / 2 - .4)));
    const x = roof(r, 'gable', RED); x.position.set(r.x, 2.6, r.z); scene.add(x);
  }
  pav(LR(780, 320, 900, 390)); pav(LR(915, 320, 1040, 385));
  const WK = R(1000, 1240, 1070, 1900); box(WK.w, .3, WK.d, M(0xa63f3f), WK.x, 3, WK.z); // covered walkway
  for (let z = WK.z - WK.d / 2 + 1; z < WK.z + WK.d / 2; z += 6) [-1, 1].forEach(s => box(.25, 3, .25, M(0x7a5c3e), WK.x + s * (WK.w / 2 - .3), 1.5, z));
  [[665, 330], [170, 730], [985, 1440], [610, 1520], [330, 1210], [560, 470]].forEach(([px, py]) => { // last tree moved so it stays clear of the new Technology Bldg.
    const x = (px - 900) / S, z = (py - 1000) / S;
    box(.4, 2, .4, M(0x6b4a2f), x, 1, z); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), M(0x4f7f3f));
    f.position.set(x, 3.6, z); f.castShadow = true; scene.add(f);
  });
  const gq = R(930, 480, 1120, 1250), gl = LR(760, 305, 1065, 405);
  const GR = [{ name: 'Quadrangle', p: new THREE.Vector3(gq.x, 0, gq.z) }, { name: 'Student Lounge', p: new THREE.Vector3(gl.x, 0, gl.z) }];
  GR.forEach(q => label(q.name, q.p, null));

  // ================= INTERIOR SYSTEM =================
  // Plan units are metres. u = across the plan (left to right), v = down the plan.
  // Room format: [name, type, u1, v1, u2, v2]
  // types: o office, c CR, s stairs, h hall, l lab, b special room, k stock/dark/control room, t lobby/canteen, r ramp/roof/parking, f faculty, e lecture/classroom
  // Options: mir = flip which end of the building u=0 sits at; fx = flip the plan's v direction (plan bottom faces west instead of east)
  //          o = custom origin {x,z,d}; poly = footprint polygon (world x,z) used for the floor slab
  //          PXf / PZf = custom mapping functions (used when one plan is stretched over more than one building)
  //          bs = list of buildings that open together; view = {x,z,w,d} camera focus
  const TC = { o: 0xf3e3c3, c: 0xbfe0ea, s: 0xb4b4c2, h: 0xe4e4e4, l: 0xcfe0f5, b: 0xe6d7f0, k: 0xd9d1c0, t: 0xf7f0df, r: 0xcbd8c0, f: 0xf7dfd0, e: 0xf6edcf };
  function interior(c) {
    const v0 = c.o || c.b.vols[0], sx = c.fx ? -1 : 1,
      PX = c.PXf || (v => v0.x + sx * (v - c.vc) * c.kv), PZ = c.PZf || (u => c.mir ? v0.z - v0.d / 2 + u * c.ku : v0.z + v0.d / 2 - u * c.ku);
    c.bs = c.bs || [c.b]; c.IF = [];
    c.FL.forEach((rooms, f) => {
      const g = new THREE.Group(); g.visible = false; scene.add(g); c.IF.push(g); const y0 = f * H + .2;
      if (c.poly) {
        const sg = new THREE.ShapeGeometry(new THREE.Shape(c.poly.map(([x, z]) => new THREE.Vector2(x, -z)))); sg.rotateX(-Math.PI / 2);
        const bm = new THREE.Mesh(sg, M(0xf7f7f4, { side: THREE.DoubleSide })); bm.position.y = y0; g.add(bm);
      } else box(c.V * c.kv, .04, c.U * c.ku, M(0xf7f7f4), PX(c.V / 2), y0, PZ(c.U / 2), g);
      rooms.forEach(([n, t, u1, v1, u2, v2], i) => {
        const xa = PX(v1), xb = PX(v2), za = PZ(u1), zb = PZ(u2), w = Math.abs(xb - xa), d = Math.abs(zb - za), x = (xa + xb) / 2, z = (za + zb) / 2;
        box(w, .06, d, M(TC[t]), x, y0 + .05 + i * .004, z, g);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 2.6, d)), new THREE.LineBasicMaterial({ color: 0x3a3f47 }));
        e.position.set(x, y0 + 1.3, z); g.add(e);
        if (n) {
          const d2 = document.createElement('div'); d2.className = 'cmap-lbl rl'; d2.textContent = n; labelHost.appendChild(d2);
          labels.push({ el: d2, p: new THREE.Vector3(x, 0, z), f, r: 1, ib: c });
        }
      });
      const m = c.MK[f], rt = c.RT[f], RC = 0xd0213a;
      m.fe.forEach(([u, v]) => box(.45, 1.1, .35, M(RC), PX(v), y0 + .6, PZ(u), g));                       // fire extinguishers
      m.el.forEach(([u, v]) => box(.6, .45, .12, M(0x2a63c9), PX(v), y0 + 2.1, PZ(u), g));                 // emergency lights
      m.fh.forEach(([u, v]) => {
        const cy = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .2, 16), M(RC)); // fire house cabinet
        cy.rotation.z = Math.PI / 2; cy.position.set(PX(v), y0 + 1.4, PZ(u)); g.add(cy);
      });
      rt.l.forEach(pl => {
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pl.map(([u, v]) => new THREE.Vector3(PX(v), y0 + .3, PZ(u)))),
          new THREE.LineDashedMaterial({ color: RC, dashSize: .7, gapSize: .45 })); ln.computeLineDistances(); g.add(ln); // escape route
      });
      rt.a.forEach(([u, v, d]) => {
        const a = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.1, 8), M(RC));      // exit arrows
        const s = d[1] === '+' ? 1 : -1, dir = d[0] === 'v' ? new THREE.Vector3(sx * s, 0, 0) : new THREE.Vector3(0, 0, (c.mir ? 1 : -1) * s);
        a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); a.position.set(PX(v), y0 + .35, PZ(u)); g.add(a);
      });
    });
    return c;
  }
  const ad = (a, v) => a.map(u => [u, v]);

  // ---------- ADMINISTRATION BLDG. ----------
  const AV = B[0].vols[0];
  const IA = interior({ b: B[0], name: 'Administration Bldg.', kv: AV.d / 67.4, ku: AV.d / 67.4, vc: 8.05, U: 67.5, V: 19, mir: false, // mir:true puts the ramp end in the south
    FL: [
      [['ROTC Office', 'o', 0, 0, 4, 6.7], ['', 'h', 0, 6.7, 4.2, 13.6], ['Stairs', 's', .1, 6.8, 4.2, 10.9], ["President's Office", 'o', 4.2, 3, 8.8, 10.1],
        ['CR', 'c', 4.2, 10.1, 8.8, 13.6], ['Board Room', 'o', 8.8, 3, 13.3, 8.4], ['Secretary Office', 'o', 8.8, 10.1, 13.3, 13.6],
        ['Stock Room', 'k', 13.3, 3, 15, 6.3], ['CR', 'c', 15, 3, 17.7, 6.3], ['Office', 'o', 17.7, 3, 22.2, 6.5],
        ["Administrator's Office", 'o', 13.3, 6.5, 22.4, 10.5], ['Asst. to the President', 'o', 13.3, 10.5, 17.8, 13.6], ['Media Office', 'o', 17.8, 10.5, 22.4, 13.6],
        ['Stock Room', 'k', 22.2, 0, 26.7, 3], ['', 'o', 22.2, 3, 26.8, 6.5], ['HR Office', 'o', 22.4, 6.5, 26.8, 10.5], ['HR Office', 'o', 24.3, 10.5, 26.8, 13.6],
        ["Registrar's Office", 'o', 26.8, 3, 31.2, 10.5], ['Lobby', 't', 31.2, 0, 35.4, 13.6], ['Office of the Treasurer', 'o', 35.4, 2.7, 40, 6.3],
        ['Accounting Office', 'o', 35.4, 6.3, 44.4, 13], ['CAS Faculty', 'f', 44.4, 5.9, 53.3, 13], ['CCS Faculty', 'f', 53.3, 5.9, 57.9, 13],
        ['Female CR', 'c', 57.9, 5.9, 62.3, 13], ['Ramp', 'r', 62.3, 5.1, 67.1, 12.8], ['Hallway', 'h', 0, 13.6, 67.1, 16.1]],
      [['Registrar Stock Rm', 'k', 0, 0, 4.1, 3], ['', 'h', 0, 3, 4.1, 13.6], ['Stairs', 's', 1.9, 5.3, 4.1, 13.6], ['A201', 'l', 4.1, 3, 13.1, 13.6],
        ['A202', 'l', 13.1, 3, 22.2, 13.6], ['A203', 'l', 22.2, 3, 32.2, 13.6], ['MIS Office', 'o', 22.2, 3, 24.5, 6.7],
        ['A204', 'l', 32.2, 3, 40.2, 13.6], ['A205', 'l', 40.2, 3, 49.2, 13.6], ['A206', 'l', 49.2, 3, 58.3, 13.6],
        ['Male CR', 'c', 58.3, 3, 62.7, 13.6], ['Ramp', 'r', 62.7, 5.1, 67.4, 12.8], ['Hallway', 'h', 0, 13.6, 67.4, 16.1]],
      [['Research Office', 'o', 0, 0, 4.1, 3], ['', 'h', 0, 3, 4.2, 13.6], ['Stairs', 's', 2.2, 5.4, 4.2, 13.6], ['E-Library', 'b', 4.2, 3, 13.2, 13.6],
        ['Library', 'b', 13.2, 3, 49, 13.6], ['Library Stockroom', 'k', 49, 3, 58.2, 13.6], ['Female CR', 'c', 58.2, 3, 62.7, 13.6],
        ['Ramp', 'r', 62.7, 5.1, 67.5, 12.8], ['Hallway', 'h', 0, 13.6, 67.5, 16.1], ['Canopy', 'r', 0, 16.1, 6, 19]]
    ],
    MK: [{ fe: ad([27.1, 60.1], 14.4), el: ad([10, 19.1, 50.2], 13.7), fh: ad([62.2], 13.7) },
      { fe: ad([10, 27.9, 55.1], 14.4), el: ad([6.1, 16.1, 32.4, 53.4], 13.7), fh: ad([61.5], 13.7) },
      { fe: ad([10.3, 23.8, 54.9], 14.4), el: ad([8.1, 20.7, 36.7, 52.9], 13.7), fh: ad([61.2], 13.7) }],
    RT: [{ l: [[[1, 15.2], [66.5, 15.2]]], a: [[1.5, 16.6, 'v+'], [30.5, 16.6, 'v+'], [63.5, 16.6, 'v+']] },
      { l: [[[1, 15.2], [66.5, 15.2]]], a: [] }, { l: [[[1, 15.2], [66.5, 15.2]]], a: [] }]
  });

  // ---------- CRIMINOLOGY BLDG. ----------
  // Plan: 21 m wide x 19 m deep. Plan bottom faces east (toward Admin), plan right faces north (toward the Covered Court).
  const CV = B[4].vols[0];
  const IC = interior({ b: B[4], name: 'Criminology Building', kv: CV.w / 19, ku: CV.d / 21, vc: 9.5, U: 21, V: 19, mir: false,
    FL: [
      [['Lecture Room', 'e', 0, 0, 9, 7], ['Lecture Room', 'e', 9, 0, 18, 7], ['Restroom', 'c', 18, 0, 21, 3.8], ['CR', 'c', 18, 3.8, 21, 7],
        ['Hallway', 'h', .6, 7, 18.9, 8.5], ['', 'h', .6, 8.5, 2, 19], ['Consultation Room', 'o', 2, 8.5, 8.5, 15.4],
        ['', 'h', 8.5, 8.5, 14.4, 15.5], ['Stairs / Ramp', 's', 9.5, 9.2, 13.5, 15.2], ['', 'h', 14.4, 8.5, 18.9, 10],
        ['Lecture Room', 'e', 14.4, 10, 18.9, 19], ['Registration Office', 'o', 2, 15.5, 14.4, 19], ['Passage to Admin Bldg.', 'h', 18.9, 7, 21, 19]],
      [['Crim Audio Visual Room', 'e', 0, 0, 18, 7.1], ['Restroom', 'c', 18, 0, 21, 3.6], ['CR', 'c', 18, 3.6, 21, 7.1],
        ['Hallway', 'h', 2.7, 7.1, 18.9, 8.6], ['Fire Exit', 's', 0, 7.1, 2.7, 8.6], ['Interrogation Room', 'b', .9, 8.6, 8.5, 15.4],
        ['', 'h', 8.5, 8.6, 14.5, 15.4], ['Stairs / Ramp', 's', 9.5, 9.2, 13.5, 15.4], ['Crime Scene Simulation Area', 'b', 1, 15.4, 14.5, 19],
        ['Lecture Room', 'e', 14.5, 8.6, 18.9, 19], ['Walkway to Covered Court', 'h', 18.9, 7.1, 21, 19]],
      [['Forensic Chem. & Toxicology Lab', 'l', 0, 0, 9, 7], ['Forensic Lab Working Area', 'l', 9, 0, 18, 7], ['Restroom', 'c', 18, 0, 21, 3.4], ['CR', 'c', 18, 3.4, 21, 7],
        ['Hallway', 'h', 2.4, 7, 20.8, 8.5], ['Fire Exit 1', 's', 0, 7, 2.4, 8.5], ['Fire Exit 2', 's', 20.8, 7, 21, 8.5],
        ['Criminology Forensic Lab', 'l', .7, 8.5, 8.4, 19], ['', 'h', 8.4, 8.5, 14.4, 15.5], ['Stairs / Ramp', 's', 9.4, 9.2, 13.4, 14.6],
        ['Dark Room', 'k', 8.4, 15.5, 14.4, 19], ['Moot Court Simulation Room', 'b', 14.4, 8.5, 18.8, 19], ['Roof', 'r', 18.8, 8.5, 21, 19]]
    ],
    MK: [{ fe: [[3, 7.7], [16.7, 9.3], [20.1, 7.9]], el: [[4.3, 7.7], [12.8, 7.7], [18.9, 7.7], [1.9, 15.2]], fh: [[20.7, 7.6]] },
      { fe: [[4.8, 7.7], [11.2, 7.8], [17.2, 7.7], [20.1, 7.9]], el: [[6, 7.7], [12.8, 7.7], [19, 7.7]], fh: [[20.8, 7.6]] },
      { fe: [[4.5, 7.7], [16.6, 7.7], [19.5, 7.7]], el: [[5.7, 7.7], [10.6, 7.7], [18.5, 7.7]], fh: [[20.6, 7.5]] }],
    RT: [{ l: [[[18.3, 7.7], [1.2, 7.7], [1.2, 18.6]], [[20.2, 8.3], [20.9, 18.6]]], a: [[1.2, 19.3, 'v+'], [20.9, 19.3, 'v+']] },
      { l: [[[18.3, 7.7], [1.5, 7.7]], [[20.2, 8.3], [20.8, 18.4]]], a: [[.4, 7.7, 'u-'], [20.8, 19.1, 'v+']] },
      { l: [[[18.3, 7.7], [1, 7.7]], [[19, 7.7], [21.2, 7.7]]], a: [[.2, 7.7, 'u-'], [21.6, 7.7, 'u+']] }]
  });

  // ---------- ENGINEERING BLDG. ----------
  // Plan: 63.2 m long. The hallway side (plan bottom, "Going to Quadrangle") faces WEST toward the Quadrangle (fx:true),
  // and the ramp end (u=0) is in the north (mir:true). Plan v: 0-2.7 control-room strip, 2.7-11.8 rooms, 11.8-13.3 hallway.
  const EV = B[1].vols[0];
  const IE = interior({ b: B[1], name: 'Engineering Bldg.', kv: EV.d / 63.2, ku: EV.d / 63.2, vc: 6.8, U: 63.2, V: 13.6, mir: true, fx: true,
    FL: [
      [['Ramp', 'r', 0, 3.8, 4.7, 13.1], ['Male CR', 'c', 4.7, 2.7, 7.7, 7.3], ['Female CR', 'c', 4.7, 7.3, 7.7, 11.8],
        ['CE Laboratory Room 1', 'l', 7.7, 2.7, 14.3, 11.8], ['Audio Visual Room', 'b', 14.3, 2.7, 23.4, 11.8], ['Audio Visual Room', 'b', 23.4, 2.7, 32.3, 11.8],
        ['Control Room', 'k', 23.4, 0, 32.3, 2.7], ['E104', 'e', 32.3, 2.7, 41.1, 11.8], ['E105', 'e', 41.1, 2.7, 50, 11.8],
        ['Counseling Room', 'o', 50, 2.7, 53.2, 7.2], ['Guidance Office', 'o', 53.2, 2.7, 58.8, 7.5], ['Receiving Area', 'o', 50, 7.2, 54.3, 11.8],
        ['Testing Area', 'o', 54.3, 7.5, 58.8, 11.8], ['', 'h', 58.8, 2.7, 63.2, 4.9], ['Stairs', 's', 58.8, 4.9, 63.2, 9.2], ['E.S.O. Office', 'o', 58.8, 9.2, 63.2, 11.8],
        ['Hallway', 'h', 4.7, 11.8, 63.2, 13.3]],
      [['Ramp', 'r', 0, 3.7, 4.7, 12.7], ['Male CR', 'c', 4.7, 2.7, 7.7, 11.8], ['ME Laboratory Room 2', 'l', 7.7, 2.7, 14.3, 11.8],
        ['E202', 'e', 14.3, 2.7, 23.2, 11.8], ['E203', 'e', 23.2, 2.7, 32.2, 11.8], ['E204', 'e', 32.2, 2.7, 41, 11.8],
        ['E205', 'e', 41, 2.7, 50, 11.8], ['E206', 'e', 50, 2.7, 59, 11.8], ['', 'h', 59, 2.7, 63.2, 5], ['Stairs', 's', 59, 5, 63.2, 11.8],
        ['Hallway', 'h', 4.7, 11.8, 63.2, 13.3]],
      [['Ramp', 'r', 0, 4, 4.7, 12.8], ['Female CR', 'c', 4.7, 2.7, 7.7, 11.8], ['E301', 'e', 7.7, 2.7, 14.3, 11.8],
        ['E302', 'e', 14.3, 2.7, 23.2, 11.8], ['E303', 'e', 23.2, 2.7, 32.2, 11.8], ['E304', 'e', 32.2, 2.7, 41, 11.8],
        ['E305', 'e', 41, 2.7, 50, 11.8], ['E306', 'e', 50, 2.7, 59, 11.8], ['', 'h', 59, 2.7, 63.2, 4.9], ['Stairs', 's', 59, 4.9, 63.2, 11.8],
        ['Hallway', 'h', 4.7, 11.8, 63.2, 13.3]]
    ],
    MK: [{ fe: [[10.5, 12.6], [15.7, 8.7], [29.3, 12.6], [47, 12.6], [17.4, 12.6]], el: [[12.7, 12.6], [31.6, 12.6], [53.3, 12.6], [60.2, 12.6]], fh: [[7.3, 12.6]] },
      { fe: [[9.6, 12.6], [28.4, 12.6], [37.8, 12.6], [55.5, 12.6]], el: [[11.7, 12.6], [30.6, 12.6], [52.7, 12.6], [3.7, 6.4], [62.2, 10]], fh: [[6.7, 12.6], [62.6, 12.6]] },
      { fe: [[9.9, 12.6], [29.9, 12.6], [55.4, 12.6]], el: [[11.9, 12.6], [27.8, 12.6], [52.9, 12.6], [3.8, 6.3], [62.4, 7]], fh: [] }],
    RT: [{ l: [[[60, 12.5], [3.4, 12.5]]], a: [[3.4, 13.7, 'v+'], [4.3, 13.7, 'v+']] },
      { l: [[[30, 12.5], [1.4, 12.5], [1.4, 8.2]], [[30, 12.5], [59.2, 12.5], [59.2, 9.5]]], a: [[1.4, 7.4, 'v-'], [59.2, 8.7, 'v-']] },
      { l: [[[40, 12.6], [3.3, 12.6], [3.3, 8]], [[40, 12.6], [59, 12.6], [59, 9]]], a: [[3.3, 7.2, 'v-'], [59, 8.3, 'v-']] }]
  });

  // ---------- TECHNOLOGY BLDG. ----------
  // Rooms below are written exactly like the floor plan: [name, type, u1, v1, u2, v2] in metres, u = right, v = down (u=0 at the row's left wall).
  // The plan is rotated 180° onto the map (plan right = west, plan down = north). These helpers convert plan coordinates to interior() coordinates.
  const TR = a => a.map(([n, t, a1, b1, a2, b2]) => [n, t, b1, a1 + 6.5, b2, a2 + 6.5]);
  const QP = p => [p[1], p[0] + 6.5];
  const TM = m => ({ fe: m.fe.map(QP), el: m.el.map(QP), fh: m.fh.map(QP) });
  const DM = { right: 'v+', left: 'v-', down: 'u+', up: 'u-' };
  const TRt = r => ({ l: r.l.map(pl => pl.map(QP)), a: r.a.map(([u, v, d]) => [...QP([u, v]), DM[d]]) });
  const IT = interior({ b: B[3], name: 'Technology Bldg.', o: { x: TX0, z: TZ0, d: 0 }, kv: TK, ku: TK, vc: 0, U: 25, V: 39.5, mir: false, fx: true, poly: TPOLY.map(TW),
    FL: [
      TR([['Stock Room 3', 'k', 0, 0, 2, 7.3], ['LR4', 'e', 2, 0, 8, 7.3], ['LR5', 'e', 8, 0, 14, 7.3], ['Speech Laboratory', 'l', 14, 0, 20, 7.3],
        ['Automation Laboratory', 'l', 20, 0, 26, 7.3], ['COE Faculty Room', 'f', 26, 0, 31.5, 7.3],
        ['Hallway', 'h', 0, 7.3, 26.6, 8.6], ['', 'h', 5.6, 8.6, 7.9, 15.7], ['Hallway', 'h', -6.35, 15.7, 7.9, 17.6],
        ['CE Lab Equipment Room', 'l', 7.9, 8.7, 16.1, 14.1], ['Stairs', 's', 8, 11.6, 13.3, 14.1], ['EE Lab Equip. Room', 'l', 7.9, 14.1, 10.6, 21.9],
        ['CR', 'c', 26.6, 8.6, 29.3, 15.2], ['Stairs', 's', 22, 11.2, 24.3, 13.3],
        ['EL2', 'e', -6.35, 17.65, -.2, 21.95], ['EL1', 'e', -.2, 17.65, 7.9, 21.95], ['Physics Room', 'l', -2.7, 21.95, .9, 24.9]]),
      TR([['', 'k', 0, 0, 2, 7.4], ['Hydraulics Laboratory', 'l', 2, 0, 8.1, 7.4], ['LR1', 'e', 8.1, 0, 14.1, 7.4], ['LR2', 'e', 14.1, 0, 20.1, 7.4],
        ['LR3', 'e', 20.1, 0, 26, 7.4], ['CBA Faculty Office', 'f', 26, 0, 31.5, 7.4],
        ['Hallway', 'h', 0, 7.4, 26, 9], ['Comfort Room', 'c', 26, 9, 29.8, 14.6], ['Down to the Back Gate', 's', 21, 9, 26, 12.6], ['Down to Ground Floor', 's', 8, 9, 11.1, 13.2],
        ['', 'h', 6, 9, 8, 15.7], ['Hallway', 'h', -6.35, 15.7, 8, 17.7], ['Chem. Equip. / Materials Rm', 'k', 8, 14.5, 10.6, 21.9],
        ['EL2', 'e', -6.35, 17.7, -.2, 21.95], ['Chemistry Laboratory', 'l', -.2, 17.7, 7.9, 21.95]])
    ],
    MK: [
      TM({ fe: [[17.7, 8.4], [21.1, 5.4], [6.7, 16], [-1.8, 19], [5.5, 19]], el: [[5.2, 8.3], [7, 13.7], [2.5, 16.4], [23.1, 8.5]], fh: [] }),
      TM({ fe: [[12.7, 8.5], [27.2, 5.6], [-1.3, 18.9], [5.7, 19]], el: [[5.4, 8.3], [22.5, 8.5], [14.1, 12.2], [2.6, 16.7]], fh: [] })
    ],
    RT: [
      TRt({ l: [[[26, 8], [-1.5, 8], [-1.5, .6]], [[6.8, 8.3], [6.8, 16.5], [-6, 16.5]]], a: [[-1.5, -.2, 'up'], [-6.8, 16.5, 'left']] }),
      TRt({ l: [[[26, 8.2], [.3, 8.2]], [[6.8, 8.2], [6.8, 16.8], [-5, 16.8]], [[25.3, 8.8], [25.3, 13.8]]], a: [[25.3, 14.4, 'down'], [10.6, 9.9, 'right'], [10.6, 11, 'right']] })
    ]
  });

  // ---------- CANTEEN + ELEMENTARY BLDG. ----------
  // One plan (88 m long) covers both buildings. It is NOT rotated: plan right = east, plan down = south (the hallway faces the campus).
  // Plan u 0-19 m = Canteen building (map x -8..8), plan u 19-88 m = Elementary Bldg. (map x 8..36); plan v 0-8.95 m fills the footprint depth.
  // So the plan is squeezed lengthwise to fit the footprints. Change the two numbers in PXL / the footprints to adjust.
  const PXL = u => u <= 19 ? -8 + u * (16 / 19) : 8 + (u - 19) * (28 / 68.95);
  const PZL = v => -47.5 + v * (8.25 / 8.95);
  const TR2 = a => a.map(([n, t, a1, b1, a2, b2]) => [n, t, b1, a1, b2, a2]), QP2 = p => [p[1], p[0]];
  const TM2 = m => ({ fe: m.fe.map(QP2), el: m.el.map(QP2), fh: m.fh.map(QP2) });
  const TRt2 = r => ({ l: r.l.map(pl => pl.map(QP2)), a: r.a.map(([u, v, d]) => [...QP2([u, v]), DM[d]]) });
  const IL = interior({ b: B[5], bs: [B[5], B[6]], name: 'Canteen/Elementary Bldg.', view: { x: 14, z: -43.4, w: 44, d: 8.25 },
    PXf: PXL, PZf: PZL, mir: true, U: 8.95, V: 88, kv: 1, ku: 1, vc: 0, poly: [[-8, -47.5], [36, -47.5], [36, -39.25], [-8, -39.25]],
    FL: [
      TR2([['Canteen', 't', 0, 0, 8, 7.35], ['Canteen', 't', 8, 0, 14, 7.35], ['CR', 'c', 14, 0, 17, 7.35], ['Hallway', 'h', 17, 0, 19, 7.35],
        ['X101', 'e', 19, 0, 28, 7.35], ['X102', 'e', 28, 0, 37, 7.35], ['X103', 'e', 37, 0, 46, 7.35], ['X104', 'e', 46, 0, 55, 7.35],
        ['X105', 'e', 55, 0, 64, 7.35], ['X106', 'e', 64, 0, 73, 7.35], ['X107', 'e', 73, 0, 79, 7.35],
        ["COE Dean's Office", 'o', 79, 0, 81.92, 7.35], ['COE Faculty Room', 'f', 81.92, 0, 87.95, 7.35],
        ['Hallway', 'h', 0, 7.35, 87.95, 8.95], ['Consultation', 'o', 81.7, 7.35, 86.5, 8.95]])
    ],
    MK: [TM2({ fe: [[15.5, 1.8], [21.5, 2.8], [31.6, 8.4], [49.1, 8.3], [62.9, 8.3], [78.1, 8.1], [86.4, 5.6], [83.3, 8.7]], el: [[25.3, 8.3], [52.2, 8.3], [75.6, 8.3]], fh: [] })],
    RT: [TRt2({ l: [[[78.5, 8.1], [.5, 8.1]], [[78.5, 8.1], [80.6, 8.1], [80.6, 8.7]]], a: [[0, 8.1, 'left'], [80.6, 9.3, 'down']] })]
  });

  // ---------- HIGH SCHOOL BLDG. + MARTIAL ARTS ROOM (ground floor only) ----------
  // One plan (65.3 m long) covers both buildings. The plan is rotated 90° counter-clockwise onto the map:
  // plan right = north (the Martial Arts Room is at the north end), plan down = east (the hallway faces the Quadrangle).
  // Plan rows above the main wall (v < 0) hold the offices that stick out; every v is shifted by +3.1 m (HV) so nothing is negative.
  // Scale is the same in both directions (40 map units over 65.3 m).
  const HV = 3.1;
  const H3 = p => [p[0], p[1] + HV];
  const THR = a => a.map(([n, t, u1, v1, u2, v2]) => [n, t, u1, v1 + HV, u2, v2 + HV]);
  const THM = m => ({ fe: m.fe.map(H3), el: m.el.map(H3), fh: m.fh.map(H3) });
  const THRt = r => ({ l: r.l.map(pl => pl.map(H3)), a: r.a.map(([u, v, d]) => [u, v + HV, d]) });
  const IH = interior({ b: B[2], bs: [B[2], B[12]], name: 'High School Bldg. + Martial Arts Room', o: { x: -1, z: -1.5, d: 40 },
    kv: 40 / 65.3, ku: 40 / 65.3, vc: 12.1, U: 65.3, V: 12.1, mir: false, view: { x: -4.6, z: -1.5, w: 7.25, d: 40 },
    FL: [
      THR([['Stairs', 's', 0, 7, 3, 9], ['HSO Office', 'o', 3, 7, 5.6, 9],
        ['Drawing Classroom', 'e', 0, 0, 6, 7], ['Graduate Studies Office', 'o', 6, 0, 12, 7], ['DSA Office', 'o', 12, 0, 15, 7],
        ['Office', 'o', 15, 0, 18, 3.7], ['BED Guidance Office', 'o', 15, 3.7, 18, 7],
        ["BED Principal's Office", 'o', 18, 0, 24, 7], ['CED Consultation Rm', 'o', 24, 0, 27, 3.5], ['Stock Room', 'k', 24, 3.5, 27, 7],
        ['CED Faculty Room', 'f', 27, 0, 33, 7], ["CED Dean's Office", 'o', 30, 0, 33, 2.5],
        ['Lobby', 't', 33, 0, 39, 7], ['SSC', 'o', 39, 0, 42, 3.5], ['CBA', 'o', 39, 3.5, 42, 7], ['CAS', 'o', 42, 0, 45, 3.5], ['EDSO', 'o', 42, 3.5, 45, 7],
        ['Stock Room', 'k', 45, 0, 48, 4.5], ['PMSA', 'o', 45, 4.5, 48, 7], ['CCS', 'o', 48, 4.5, 51, 7],
        ['NSTP Office', 'o', 45, -3.1, 48, 0], ['SPC TESDA Office', 'o', 48, -3.1, 52.8, 2.4], ['', 'o', 48, 2.4, 51, 4.5], ['Stairs', 's', 51, 2.2, 52.6, 3.6],
        ['Parking Area', 'r', 52.8, -3.1, 56.3, 7], ['Martial Arts Room', 'b', 56.3, -1.7, 65.3, 7],
        ['Hallway', 'h', 5.6, 7, 65.3, 9]])
    ],
    MK: [THM({ fe: [[15, 4.9], [22.9, 1.9], [34.2, 2.9], [32.8, 6.7], [28.3, 8.3], [44.8, 8.4]], el: [[13.3, 8.2], [47.7, 8.2]], fh: [] })],
    RT: [THRt({ l: [[[65.2, 7.9], [7, 7.9]]], a: [[7.5, 9.9, 'v+'], [36, 9.9, 'v+'], [54.7, 9.9, 'v+'], [64.9, 9.9, 'v+']] })]
  });

// ---------- MACHINE SHOP (1 floor) ----------
// Plan is 42 m long (14 bays x 3 m) and 7 m deep (2 m open strip + 5 m workshop). NOT rotated:
// plan right = east (rear gate), plan left = west (Covered Court), plan top = north (Elementary Bldg.).
// Plan is squeezed lengthwise to fit the 15.5 x 8.25 footprint. Helpers TR2 / TM2 / TRt2 are reused from the Canteen block.
const MV = B[7].vols[0];
const IM = interior({ b: B[7], name: 'Machine Shop', mir: true, U: 7, V: 42, vc: 21, kv: MV.w / 42, ku: MV.d / 7,
  FL: [
    TR2([['Carpentry Workshop', 'l', 0, 0, 18, 7], ['Mechanical Workshop', 'l', 18, 0, 42, 7],
      ['Storage', 'k', 12.2, 4.4, 16.7, 7], ['PPD Office', 'o', 0, 3.6, 3, 7],
      ['To Rear Gate', 'r', 39, 0, 42, 2]])
  ],
  MK: [TM2({ fe: [[2.2, 2.6], [32.5, 5.7]], el: [[10.4, 1.1], [27.3, 1.0]], fh: [] })],
  RT: [TRt2({
    l: [
      [[41.7, -1.1], [-1.35, -1.1], [-1.35, 0.9], [-3.8, 0.9]],   // outer route
      [[41.7, -0.5], [-0.7, -0.5], [-0.7, 1.5], [-3.8, 1.5]],     // inner route
      [[34.6, -0.5], [34.6, -1.6]]                                // branch to Elementary Bldg.
    ],
    a: [[-3.8, 0.9, 'left'], [-3.8, 1.5, 'left'], [41.7, -1.1, 'right'], [41.7, -0.5, 'right'], [34.6, -1.8, 'up']]
  })]
});

  const INT = [IA, IC, IE, IT, IL, IH, IM]; let CUR = null;
  function setIN(b, on) { // make a building's shell see-through (and back)
    b.parts.forEach(p => {
      p.castShadow = !on; if (p.userData.isRoof) return;
      [].concat(p.material).forEach(m => { m.transparent = on; m.opacity = on ? .12 : 1; m.depthWrite = !on; m.needsUpdate = true; });
    });
  }

  // ---------- UI logic ----------
  let N = 99, tw = null;
  function setN(n) {
    N = n;
    // while viewing a building inside: hide its roof and any exterior floor above the floors that have an interior map
    B.forEach(o => o.parts.forEach(p => p.visible = p.userData.need <= N && !(CUR && CUR.bs.includes(o) && (p.userData.isRoof || p.userData.need > CUR.FL.length))));
    INT.forEach(c => c.IF.forEach((g, f) => g.visible = c === CUR && f + 1 <= N));
  }
  function fly(t, p) { tw = { t: 0, t0: ctl.target.clone(), p0: cam.position.clone(), t1: t, p1: p }; }
  function toggleI(c) {
    const off = CUR === c;
    if (CUR) CUR.bs.forEach(b => setIN(b, false));
    CUR = off ? null : c;
    if (CUR) CUR.bs.forEach(b => setIN(b, true));
    onInterior(CUR ? String(INT.indexOf(CUR)) : '');
    setN(N);
    if (CUR) {
      onInfo({ title: `${CUR.name} – Interior`, body: 'Use 1F / 2F / 3F to switch floors. Red = fire equipment, blue = emergency lights, dashed line = escape route.' });
      const v = CUR.view || CUR.b.vols[0], s = Math.max(v.w, v.d), t = new THREE.Vector3(v.x, 3, v.z);
      fly(t, t.clone().add(new THREE.Vector3(.6 * s, 1.3 * s, .9 * s)));
    }
  }
  function select(o) {
    onInfo({ title: o.name, body: `${o.floors} floor${o.floors > 1 ? 's' : ''} · ${RN[o.roof]}` });
    const t = new THREE.Vector3(o.p.x, o.top / 2, o.p.z); fly(t, t.clone().add(new THREE.Vector3(0, 26, 34)));
  }

  // click-to-select
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2(); let dn = [0, 0];
  const onDown = e => { dn = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (Math.hypot(e.clientX - dn[0], e.clientY - dn[1]) > 4) return;
    const r = el.getBoundingClientRect();
    pt.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(pt, cam);
    const h = ray.intersectObjects(B.map(o => o.g), true).find(i => { let n = i.object; while (n) { if (!n.visible) return false; n = n.parent } return true; });
    if (h && h.object.userData.b) select(h.object.userData.b);
  };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp);

  // resize with the container (not the window)
  const rs = () => {
    const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
    size.w = w; size.h = h; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(rs); ro.observe(mount); rs();

  // ---------- loop ----------
  const v3 = new THREE.Vector3(); let raf = 0;
  (function tick() {
    raf = requestAnimationFrame(tick);
    if (tw) {
      tw.t = Math.min(1, tw.t + .035); const e = 1 - Math.pow(1 - tw.t, 3);
      ctl.target.lerpVectors(tw.t0, tw.t1, e); cam.position.lerpVectors(tw.p0, tw.p1, e); if (tw.t >= 1) tw = null;
    }
    ctl.update(); renderer.render(scene, cam);
    const w = size.w, h = size.h;
    labels.forEach(l => {
      const o = l.o; let on = showL;
      if (l.r) { l.p.y = l.f * H + 3; on = on && CUR === l.ib && l.f === Math.min(N, l.ib.FL.length) - 1; }   // room labels: top visible interior floor only
      else { l.p.y = o ? (o.roof === 'arc' ? o.top + 1.5 : Math.min(N, o.floors) * H + 4) : 1.5; if (CUR && CUR.bs.includes(o)) on = false; }
      v3.copy(l.p).project(cam);
      l.el.style.display = (on && v3.z < 1) ? '' : 'none';
      l.el.style.transform = `translate(${(v3.x * .5 + .5) * w}px,${(-v3.y * .5 + .5) * h}px) translate(-50%,-100%)`;
    });
  })();

  function dispose() {
    cancelAnimationFrame(raf); ro.disconnect();
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp);
    ctl.dispose();
    scene.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) [].concat(n.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    labels.forEach(l => l.el.remove());
    renderer.dispose(); renderer.forceContextLoss();
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  return {
    setFloor: setN,
    setLabels: v => { showL = v; },
    setAutoRotate: v => { ctl.autoRotate = v; },
    resetView: () => fly(HOME.t.clone(), HOME.p.clone()),
    openInterior: v => v === '' ? toggleI(CUR) : toggleI(INT[+v]),   // "" = Interiors: Off
    selectBuilding: i => select(B[i]),
    selectGround: i => {
      const q = GR[i]; onInfo({ title: q.name, body: 'Grounds' });
      fly(q.p.clone(), q.p.clone().add(new THREE.Vector3(0, 30, 38)));
    },
    dispose,
  };
}

/* ============================================================
   React component
   ============================================================ */
const FLOORS = [[99, "All floors"], [1, "1F"], [2, "2F"], [3, "3F"]];

export default function CampusMap() {
  const isMobile = useIsMobile();
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const apiRef = useRef(null);

  const [floor, setFloor] = useState(99);
  const [labelsOn, setLabelsOn] = useState(true);
  const [spin, setSpin] = useState(false);
  const [interior, setInterior] = useState("");
  const [info, setInfo] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      apiRef.current = createCampus({
        mount: mountRef.current,
        labelHost: labelsRef.current,
        onInfo: setInfo,
        onInterior: setInterior,
      });
    } catch (err) {
      console.error("CampusMap failed to start:", err);
      setError("The 3D map couldn't start. Your browser or device may not support WebGL.");
    }
    return () => { apiRef.current?.dispose(); apiRef.current = null; };
  }, []);

  const pickFloor = (n) => { setFloor(n); apiRef.current?.setFloor(n); };
  const toggleLabels = () => { const v = !labelsOn; setLabelsOn(v); apiRef.current?.setLabels(v); };
  const toggleSpin = () => { const v = !spin; setSpin(v); apiRef.current?.setAutoRotate(v); };
  const pickBuilding = (i) => apiRef.current?.selectBuilding(i);
  const pickGround = (i) => apiRef.current?.selectGround(i);

  return (
    <div className={`cmap-root${isMobile ? " cmap-m" : ""}`}>
      <style>{CSS}</style>
      <div ref={mountRef} className="cmap-canvas" />
      <div ref={labelsRef} className="cmap-labels" />

      {error ? (
        <div className="cmap-error">{error}</div>
      ) : (
        <>
          {!isMobile && (
            <div className="cmap-panel cmap-side">
              <h1>St. Peter's College</h1>
              <h2>Buildings</h2>
              {BUILDING_LIST.slice(0, 7).map((b, i) => (
                <button key={b.name} type="button" onClick={() => pickBuilding(i)}>{b.name} ({b.floors}F)</button>
              ))}
              <h2>Facilities</h2>
              {BUILDING_LIST.slice(7).map((b, i) => (
                <button key={b.name} type="button" onClick={() => pickBuilding(i + 7)}>{b.name} ({b.floors}F)</button>
              ))}
              <h2>Grounds</h2>
              {GROUND_NAMES.map((n, i) => (
                <button key={n} type="button" onClick={() => pickGround(i)}>{n}</button>
              ))}
            </div>
          )}

          {isMobile ? (
            <div className="cmap-panel cmap-mobile-menu">
              <button
                type="button"
                className="cmap-mobile-menu-trigger"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? "Close map menu" : "Places & controls"}
              </button>
              {menuOpen && (
                <div className="cmap-mobile-menu-content">
                  <h2>Buildings</h2>
                  <div className="cmap-mobile-menu-grid">
                    {BUILDING_LIST.slice(0, 7).map((b, i) => (
                      <button key={b.name} type="button" onClick={() => pickBuilding(i)}>{b.name} ({b.floors}F)</button>
                    ))}
                  </div>
                  <h2>Facilities</h2>
                  <div className="cmap-mobile-menu-grid">
                    {BUILDING_LIST.slice(7).map((b, i) => (
                      <button key={b.name} type="button" onClick={() => pickBuilding(i + 7)}>{b.name} ({b.floors}F)</button>
                    ))}
                  </div>
                  <h2>Grounds</h2>
                  <div className="cmap-mobile-menu-grid">
                    {GROUND_NAMES.map((name, i) => (
                      <button key={name} type="button" onClick={() => pickGround(i)}>{name}</button>
                    ))}
                  </div>
                  <h2>Floors</h2>
                  <div className="cmap-mobile-menu-grid cmap-floor-grid">
                    {FLOORS.map(([n, txt]) => (
                      <button key={n} type="button" className={floor === n ? "on" : ""} onClick={() => pickFloor(n)}>{txt}</button>
                    ))}
                  </div>
                  <h2>Map controls</h2>
                  <div className="cmap-mobile-menu-grid">
                    <button type="button" className={labelsOn ? "on" : ""} onClick={toggleLabels}>Labels</button>
                    <button type="button" className={spin ? "on" : ""} onClick={toggleSpin}>Auto-rotate</button>
                    <button type="button" onClick={() => apiRef.current?.resetView()}>Reset view</button>
                    <select
                      aria-label="Select building interior"
                      value={interior}
                      className={interior !== "" ? "on" : ""}
                      onChange={(e) => apiRef.current?.openInterior(e.target.value)}
                    >
                      <option value="">Interiors: Off</option>
                      {INTERIOR_OPTIONS.map((name, i) => <option key={name} value={String(i)}>{name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cmap-panel cmap-bar">
              {FLOORS.map(([n, txt]) => (
                <button key={n} type="button" className={floor === n ? "on" : ""} onClick={() => pickFloor(n)}>{txt}</button>
              ))}
              <button type="button" className={labelsOn ? "on" : ""} onClick={toggleLabels}>Labels</button>
              <button type="button" className={spin ? "on" : ""} onClick={toggleSpin}>Auto-rotate</button>
              <button type="button" onClick={() => apiRef.current?.resetView()}>Reset view</button>
              <select
                value={interior}
                className={interior !== "" ? "on" : ""}
                onChange={(e) => apiRef.current?.openInterior(e.target.value)}
              >
                <option value="">Interiors: Off</option>
                {INTERIOR_OPTIONS.map((name, i) => <option key={name} value={String(i)}>{name}</option>)}
              </select>
            </div>
          )}

          {!(isMobile && menuOpen) && (
            <div className="cmap-panel cmap-info">
              {info ? <><b>{info.title}</b><br />{info.body}</> : DEFAULT_INFO}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Scoped styles (cmap- prefix so they can't clash with theme.css) */
const CSS = `
.cmap-root{position:relative;width:100%;height:100%;min-height:360px;overflow:hidden;background:#dfe7ee;color:#222;font-family:system-ui,"Segoe UI",sans-serif;font-size:13px;line-height:1.4;text-align:left}
.cmap-root *{box-sizing:border-box}
.cmap-canvas,.cmap-labels{position:absolute;inset:0}
.cmap-labels{overflow:hidden;pointer-events:none}
.cmap-lbl{position:absolute;left:0;top:0;padding:2px 7px;font-size:11px;font-weight:600;color:#fff;background:rgba(20,30,45,.78);border-radius:10px;white-space:nowrap;pointer-events:none}
.cmap-lbl.rl{font-size:10px;background:rgba(255,255,255,.88);color:#222;padding:1px 5px}
.cmap-panel{position:absolute;z-index:2;background:rgba(255,255,255,.93);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.18);padding:12px;color:#222}
.cmap-side{top:12px;left:12px;width:215px;max-height:calc(100% - 24px);overflow:auto}
.cmap-root .cmap-side h1{margin:0 0 6px;font-family:inherit;font-size:14px;font-weight:700;letter-spacing:0;text-transform:none;color:#222}
.cmap-root .cmap-side h2{margin:10px 0 3px;font-family:inherit;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#667}
.cmap-root .cmap-side button{display:block;width:100%;text-align:left;border:0;background:none;color:#222;padding:5px 6px;border-radius:6px;font:inherit;font-size:13px;font-weight:400;cursor:pointer;box-shadow:none}
.cmap-root .cmap-side button:hover{background:#e8eef5}
.cmap-bar{top:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap;max-width:340px;justify-content:flex-end}
.cmap-root .cmap-bar button,.cmap-root .cmap-bar select{width:auto;margin:0;border:1px solid #c5d0dc;background:#fff;color:#222;border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;font-weight:400;cursor:pointer;box-shadow:none}
.cmap-root .cmap-bar button.on,.cmap-root .cmap-bar select.on{background:#1f4e79;color:#fff;border-color:#1f4e79}
.cmap-root .cmap-bar select option{background:#fff;color:#222}
.cmap-root .cmap-mobile-menu button,.cmap-root .cmap-mobile-menu select{width:100%;margin:0;border:1px solid #c5d0dc;background:#fff;color:#222;border-radius:8px;padding:7px 8px;font:inherit;font-size:12px;font-weight:400;cursor:pointer;box-shadow:none}
.cmap-root .cmap-mobile-menu button.on,.cmap-root .cmap-mobile-menu select.on{background:#1f4e79;color:#fff;border-color:#1f4e79}
.cmap-root .cmap-mobile-menu h2{grid-column:1/-1;margin:10px 0 3px;font-family:inherit;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#667}
.cmap-info{bottom:12px;right:12px;width:230px}
.cmap-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#555}
.cmap-m .cmap-mobile-menu{top:8px;left:8px;right:8px;bottom:8px;padding:0;background:transparent;box-shadow:none;pointer-events:none}
.cmap-m .cmap-mobile-menu>*{pointer-events:auto}
.cmap-root .cmap-mobile-menu .cmap-mobile-menu-trigger{width:auto;min-width:150px;background:rgba(255,255,255,.96);box-shadow:0 4px 18px rgba(0,0,0,.18);font-weight:600}
.cmap-mobile-menu-content{max-height:calc(100% - 48px);overflow:auto;margin-top:6px;padding:10px;background:rgba(255,255,255,.97);border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.18)}
.cmap-mobile-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.cmap-mobile-menu-grid button{text-align:left}
.cmap-mobile-menu-grid.cmap-floor-grid button{text-align:center}
.cmap-m .cmap-info{left:8px;right:8px;bottom:8px;width:auto}
`;