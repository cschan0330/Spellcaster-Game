import * as T from "three";

export function motionTracks(node, frames) {
  const times = frames.map(([time]) => time);
  const positions = frames.flatMap(([, position]) => position);
  const rotations = frames.flatMap(([, , angles]) =>
    new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray());
  return [
    new T.VectorKeyframeTrack(`${node}.position`, times, positions),
    new T.QuaternionKeyframeTrack(`${node}.quaternion`, times, rotations),
  ];
}

export function wizardClips(name, index) {
  const body = `${name}-motion`;
  const grip = `${name}-grip`;
  const rest = [0, 0, 0];
  const shoulder = [-.31, 1.39, 0];
  const hand = (frames) => motionTracks(grip, frames.map(([t, rotation]) => [t, shoulder, rotation]));
  const sweep = [-.24, .23, -.04, .42, -.39][index];
  const lift = [.04, .10, .0, .15, .065][index];
  const clip = (label, bodyFrames, handFrames) =>
    new T.AnimationClip(`${name}-${label}`, -1, [...motionTracks(body, bodyFrames), ...hand(handFrames)]);
  return [
    clip("idle", [[0, rest, rest], [1.1, [0,.023,0], [0,.035,-.018]], [2.2, rest, rest]],
      [[0, rest], [1.1, [-.036,0,.024]], [2.2, rest]]),
    clip("cast", [
      [0, rest, rest], [.26, [0,.025,-.10], [-.14,-.3,-.09]],
      [.48, [0,.06+lift,.02], [-.055,sweep*.6,.06]],
      [.76, [0,lift,.16], [.16,sweep*.3,.05]], [1.16, rest, rest],
    ], [[0, rest], [.26, [-.43,0,-.43]], [.48, [-1.06,sweep,-.20]],
      [.76, [1.05,sweep*.3,.37]], [.93, [.52,0,.19]], [1.16, rest]]),
    clip("guard", [[0, rest, rest], [.23, [-.08,-.11,-.09], [-.12,-.24,-.14]],
      [.55, [-.08,-.13,-.10], [-.15,-.26,-.1]], [.69, [.02,-.12,-.2], [-.22,-.19,-.03]],
      [.8, [0,-.065,-.06], [-.12,-.09,-.02]], [.97, rest, rest]],
      [[0, rest], [.23, [.59,-.22,-.92]], [.55, [.67,-.18,-1.07]],
        [.69, [.8,-.12,-1.12]], [.8, [.46,-.07,-.54]], [.97, rest]]),
    clip("damage", [
      [0, rest, rest], [.095, [.085,.08,-.25], [-.31,.14,-.28]],
      [.25, [-.08,-.12,-.22], [.29,-.12,.12]], [.47, [.03,.01,-.075], [-.08,.04,-.07]],
      [.82, rest, rest],
    ], [[0, rest], [.095, [-.36,-.22,-.49]], [.25, [.64,.09,.31]], [.49, [-.21,0,-.16]], [.82, rest]]),
    clip("elimination", [
      [0, rest, rest], [.11, [.1,.055,-.24], [-.28,.10,-.22]],
      [.32, [.13,-.36,-.24], [-.38,.15,-.34]], [.65, [.20,-.28,-.48], [-1.28,.25,-.23]],
      [.84, [.22,-.19,-.52], [-1.56,.18,-.13]], [1.1, [.22,-.18,-.52], [-1.51,.18,-.13]],
    ], [[0, rest], [.11, [-.44,-.1,-.4]], [.32, [.56,.2,.69]], [.65, [1.65,.14,.52]], [1.1, [1.38,.16,.32]]]),
  ];
}

export function playerClips() {
  const rest = [0, 0, 0];
  const clip = (name, frames) => new T.AnimationClip(name, -1, motionTracks("player-wand-motion", frames));
  return [
    clip("cast", [
      [0, rest, rest], [.12, [-.075,-.115,.09], [-.43,.13,.19]],
      [.25, [.012,.22,-.2], [.74,-.14,-.13]], [.34, [.029,.11,-.10], [.39,0,-.055]],
      [.55, rest, rest],
    ]),
    clip("counter", [
      [0, rest, rest], [.10, [.16,.15,.04], [.25,-.31,-.49]],
      [.27, [-.06,.13,-.12], [.34,.3,.37]], [.52, rest, rest],
    ]),
    clip("damage", [
      [0, rest, rest], [.075, [.19,-.18,.19], [-.48,-.24,-.40]],
      [.20, [-.11,-.24,.10], [.27,.27,.37]], [.39, [.033,-.11,.06], [-.17,-.05,-.09]],
      [.67, rest, rest],
    ]),
    clip("elimination", [
      [0, rest, rest], [.09, [.16,-.15,.22], [-.5,-.25,-.42]],
      [.34, [.26,-.42,.16], [.23,-.10,-.75]], [.76, [.18,-1.0,.15], [1.06,-.15,-1.1]],
    ]),
  ];
}

export function buildWand() {
  const wand = new T.Group();
  const motion = new T.Group();
  motion.name = "player-wand-motion";
  wand.add(motion);
  const wood = new T.MeshStandardMaterial({ color: 0x4f2b24, flatShading: true, roughness: .9 });
  const brass = new T.MeshStandardMaterial({ color: 0xc4985d, flatShading: true, roughness: .55 });
  const leather = new T.MeshStandardMaterial({ color: 0x312234, flatShading: true });
  const jewel = new T.MeshStandardMaterial({ color: 0xca75ff, emissive: 0xca75ff, emissiveIntensity: .7, flatShading: true });
  const add = (geometry, material, x, y, z) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    motion.add(mesh);
    return mesh;
  };
  add(new T.CylinderGeometry(.035, .10, .76, 6), wood, 0, .31, 0).rotation.x = -.17;
  add(new T.CylinderGeometry(.103, .12, .27, 6), leather, 0, .02, .06);
  for (const [height, radius] of [[.18, .11], [.31, .081], [.55, .062], [.68, .057]]) {
    add(new T.CylinderGeometry(radius, radius * 1.08, .035, 6), brass, 0, height, -.17 * (height - .31));
  }
  add(new T.OctahedronGeometry(.105), jewel, 0, .78, -.08).scale.set(.68, 1.45, .68);
  const grip = add(new T.DodecahedronGeometry(.19), leather, .13, -.015, .11);
  grip.scale.set(.8, .62, .7);
  add(new T.BoxGeometry(.15, .35, .15), leather, .19, -.2, .1).rotation.z = -.3;
  return { wand, jewel };
}

