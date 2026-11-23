import * as T from "three";
import { motionTracks } from "../lib/spellcaster-animation";

export function createWizardPortrait(host) {
  const renderer = new T.WebGLRenderer({ antialias: false });
  renderer.setSize(112, 112, false);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0x2b1a39);
  const camera = new T.OrthographicCamera(-.97, .97, .97, -.97, .1, 20);
  camera.position.set(0, .79, 4);
  camera.lookAt(0, .79, 0);
  const motion = new T.Group();
  motion.name = "portrait-head";
  scene.add(motion, new T.HemisphereLight(0xf8dfff, 0x554364, 2.25));
  const key = new T.DirectionalLight(0xffdcc9, 2.2);
  key.position.set(-2, 4, 5);
  scene.add(key);

  const rest = [0, 0, 0];
  const mixer = new T.AnimationMixer(scene);
  const clips = {
    idle: [[0, rest, [0,-.1,0]], [1.15,[0,.025,0],[.04,.14,.03]], [2.3,rest,[0,-.1,0]]],
    damage: [[0,rest,rest], [.10,[.14,-.035,-.13],[-.31,-.28,-.32]], [.25,[-.08,-.12,0],[.23,.26,.21]],
      [.48,[.04,.018,0],[-.09,-.10,-.07]], [.79,rest,rest]],
    elimination: [[0,rest,rest], [.12,[.12,-.05,-.1],[-.27,.2,-.25]], [.42,[.19,-.26,-.08],[.31,.16,-.56]],
      [.85,[.26,-.49,-.09],[.59,.14,-1.04]]],
  };
  const actions = new Map(Object.entries(clips).map(([name, frames]) =>
    [name, mixer.clipAction(new T.AnimationClip(name, -1, motionTracks(motion.name, frames)))]));
  let active;
  let cue;
  let action;

  return {
    host,
    draw(head, state, turn, delta) {
      if (head !== active) {
        motion.clear();
        const copy = head.clone(true);
        copy.position.y -= 1.53;
        motion.add(copy);
        active = head;
        cue = null;
      }
      const current = state === "idle" ? state : `${turn}:${state}`;
      if (cue !== current) {
        action?.stop();
        action = actions.get(state);
        action.reset().setLoop(state === "idle" ? T.LoopRepeat : T.LoopOnce, state === "idle" ? Infinity : 1);
        action.clampWhenFinished = state !== "idle";
        action.play();
        cue = current;
        host.dataset.animation = state;
      }
      mixer.update(delta);
      renderer.render(scene, camera);
      host.dataset.ready = "true";
    },
    dispose() {
      mixer.stopAllAction();
      motion.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete host.dataset.ready;
    },
  };
}
