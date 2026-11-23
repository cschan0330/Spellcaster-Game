import * as T from "three";

export function createSpellWard() {
  const group = new T.Group();
  group.position.set(0, 1.6, .87);
  group.visible = false;
  const veil = new T.MeshBasicMaterial({ transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  const sigil = veil.clone();
  const pulse = veil.clone();
  const white = new T.Color(0xffffff);
  const disk = new T.Mesh(new T.CircleGeometry(1.15, 8, Math.PI / 8), veil);
  const rings = new T.Group();
  rings.position.z = .045;
  rings.add(new T.Mesh(new T.RingGeometry(1.07, 1.15, 8, 1, Math.PI / 8), sigil));
  const inner = new T.Mesh(new T.RingGeometry(.73, .76, 4, 1, Math.PI / 4), sigil);
  inner.rotation.z = Math.PI / 4;
  rings.add(inner);
  const marks = new T.BoxGeometry(.07, .18, .035);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const mark = new T.Mesh(marks, sigil);
    mark.position.set(Math.sin(angle) * .95, Math.cos(angle) * .95, .02);
    mark.rotation.z = -angle;
    rings.add(mark);
  }
  const wave = new T.Mesh(new T.RingGeometry(1.02, 1.10, 8, 1, Math.PI / 8), pulse);
  wave.position.z = .09;
  const fragments = new T.Group();
  const fragmentMaterial = veil.clone();
  const shard = new T.CircleGeometry(.23, 3);
  for (let index = 0; index < 12; index++) {
    fragments.add(new T.Mesh(shard, fragmentMaterial));
  }
  group.add(disk, rings, wave, fragments);

  return {
    group,
    show(time, tint, reduced) {
      fragments.visible = false;
      disk.visible = rings.visible = true;
      group.visible = time >= .12 && time < 1.03;
      if (!group.visible) return;
      const rise = Math.min(1, (time - .12) / .22);
      const fall = Math.min(1, (1.03 - time) / .22);
      const strength = rise * fall;
      group.scale.setScalar(reduced ? 1 : .67 + rise * .33);
      veil.color.setHex(tint);
      veil.opacity = strength * .24;
      sigil.color.setHex(tint).lerp(white, .62);
      sigil.opacity = strength * .91;
      rings.rotation.z = reduced ? 0 : time * .66;
      const hit = Math.max(0, (time - .61) / .33);
      wave.visible = hit > 0 && hit < 1;
      wave.scale.setScalar(reduced ? 1 : 1 + hit * .53);
      pulse.color.copy(sigil.color);
      pulse.opacity = .94 * (1 - hit);
    },
    shatter(time, tint, reduced) {
      const duration = reduced ? .22 : .58;
      if (time >= duration) return;
      group.visible = fragments.visible = true;
      disk.visible = rings.visible = wave.visible = false;
      group.scale.setScalar(1);
      const progress = time / duration;
      const travel = reduced ? 0 : progress;
      fragmentMaterial.color.set(tint ?? 0xffffff);
      fragmentMaterial.opacity = 1 - progress;
      fragments.children.forEach((fragment, index) => {
        const angle = index * Math.PI / 6;
        const radius = .78 + travel * (1.4 + .23 * (index % 3));
        fragment.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius - travel ** 2 * .42, travel * .45);
        fragment.rotation.set(travel * 4, travel * (index % 2 ? 5 : -5), angle + travel * 3);
      });
    },
  };
}
