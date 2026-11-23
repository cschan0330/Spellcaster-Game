import * as T from "three";

export function createImpactPlayer(asset, enemyTarget, playerTarget) {
  const models = new Map(asset.scene.children.map(model => [model.name, model]));
  const clips = new Map(asset.animations.map(clip => [clip.name, clip]));
  const live = [];
  const discard = (effect) => {
    effect.mixer.stopAllAction();
    effect.model.removeFromParent();
  };

  return {
    play(cue) {
      if (!cue) return;
      const target = cue.target === "player" ? playerTarget : enemyTarget;
      cue.elements.forEach((element, index) => {
        if (!models.has(element) || !clips.has(element)) return;
        const model = models.get(element).clone(true);
        const offset = (index - (cue.elements.length - 1) / 2) * .36;
        model.position.set(offset, 0, index % 2 ? -.12 : .13);
        model.rotation.y = index * .65;
        model.scale.setScalar(cue.target === "player" ? .84 : 1);
        target.add(model);
        const mixer = new T.AnimationMixer(model);
        const clip = clips.get(element);
        mixer.clipAction(clip).setLoop(T.LoopOnce, 1).startAt(index * .085).play();
        live.push({ model, mixer, time: 0, end: index * .085 + clip.duration });
      });
    },
    update(delta) {
      for (let i = live.length - 1; i >= 0; i--) {
        const effect = live[i];
        effect.time += delta;
        if (effect.time >= effect.end) {
          discard(effect);
          live.splice(i, 1);
        } else {
          effect.mixer.update(delta);
        }
      }
    },
    dispose() {
      live.forEach(discard);
      live.length = 0;
    },
  };
}
