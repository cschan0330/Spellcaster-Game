import { useEffect, useRef } from "react";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildWand, playerClips } from "../lib/spellcaster-animation";
import { createWizardPortrait } from "./wizard-portrait";
import { createImpactPlayer } from "./elemental-impacts";
import { createSpellWard } from "./spell-ward";

const directory = "/assets/3d/";
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wandColors = { fire: 0xff602b, water: 0x3ad2ff, earth: 0x92da58, wind: 0xa9faf1, lightning: 0xca75ff };
const enemyClips = { idle: "idle", cast: "cast", defend: "guard", hurt: "damage", defeat: "elimination" };

function changeClip(oldAction, newAction, loop = false) {
  oldAction?.stop();
  if (!newAction) return null;
  newAction.reset().setLoop(loop ? T.LoopRepeat : T.LoopOnce, loop ? Infinity : 1);
  newAction.clampWhenFinished = !loop;
  return newAction.play();
}

function dispose(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse((item) => {
    if (!item.isMesh) return;
    geometries.add(item.geometry);
    const list = Array.isArray(item.material) ? item.material : [item.material];
    list.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export default function DuelScene({ element, player, pose, view, playerAction, impact, guard, playerGuard, focus, shieldBroken, turn, paused, portraitHost }) {
  const host = useRef(null);
  const current = useRef({ element, player, pose, playerAction, impact, guard, playerGuard, focus, shieldBroken, turn, paused });
  useEffect(() => {
    current.current = { element, player, pose, playerAction, impact, guard, playerGuard, focus, shieldBroken, turn, paused };
  }, [element, player, pose, playerAction, impact, guard, playerGuard, focus, shieldBroken, turn, paused]);

  useEffect(() => {
    const container = host.current;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      container.dataset.failed = "true";
      return;
    }
    renderer.setPixelRatio(1);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    container.appendChild(renderer.domElement);

    const stage = new T.Scene();
    stage.background = new T.Color(0x382052);
    stage.fog = new T.FogExp2(0x67408f, .0165);
    const camera = new T.PerspectiveCamera(46, 1, .08, 160);
    camera.position.set(0, 1.7, 8.8);
    const restingPitch = Math.atan2(.42, 10.3);
    const aimTarget = new T.Vector3();
    const opponent = new T.Vector3(0, 1.66, 0);
    const opponentVitals = new T.Vector3(0, 3.42, 0);
    camera.rotation.order = "YXZ";
    const enemyImpactTarget = new T.Group();
    const ward = createSpellWard();
    const playerWard = createSpellWard();
    playerWard.group.position.set(0, -.20, -4.05);
    const playerImpactTarget = new T.Group();
    playerImpactTarget.position.set(0, -1.48, -4.3);
    camera.add(playerImpactTarget, playerWard.group);
    stage.add(camera, enemyImpactTarget, ward.group);

    const foreground = new T.Scene();
    const handCamera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 10);
    handCamera.position.z = 3;
    const { wand, jewel, tip } = buildWand();
    const tipLight = new T.PointLight(0xffffff, 0, 1.25, 2);
    tipLight.position.copy(tip.position);
    tipLight.position.z += .12;
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 64;
    const haloContext = haloCanvas.getContext("2d");
    const gradient = haloContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, .9)");
    gradient.addColorStop(.35, "rgba(255, 255, 255, .45)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    haloContext.fillStyle = gradient;
    haloContext.fillRect(0, 0, 64, 64);
    const haloTexture = new T.CanvasTexture(haloCanvas);
    const halo = new T.Sprite(new T.SpriteMaterial({
      map: haloTexture, transparent: true, depthWrite: false, toneMapped: false,
    }));
    halo.position.copy(tipLight.position);
    tip.parent.add(tipLight, halo);
    const handMixer = new T.AnimationMixer(wand);
    const handActions = new Map(playerClips().map(clip => [clip.name, handMixer.clipAction(clip)]));
    wand.scale.setScalar(.76);
    wand.position.y = -1.02;
    foreground.add(wand, new T.HemisphereLight(0xe8cdff, 0x402751, 2.25));
    const handLight = new T.DirectionalLight(0xffd5a1, 2.4);
    handLight.position.set(-3, 6, 5);
    foreground.add(handLight);
    stage.add(new T.HemisphereLight(0xe8ceff, 0x493455, 2.1));
    const moon = new T.DirectionalLight(0xb98dff, 2.25);
    moon.position.set(-7, 11, -5);
    stage.add(moon);
    const fill = new T.DirectionalLight(0xffd8c3, 1.65);
    fill.position.set(2.5, 5, 8);
    stage.add(fill);
    for (const x of [-5.1, 5.1]) {
      const flame = new T.PointLight(0xff962f, 35, 7.5, 2);
      flame.position.set(x, 1.98, .95);
      stage.add(flame);
    }

    const shadow = new T.Mesh(
      new T.CircleGeometry(.8, 24),
      new T.MeshBasicMaterial({ color: 0x1a1027, transparent: true, opacity: .3, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, .029, .06);
    shadow.scale.y = .75;
    stage.add(shadow);

    function resize() {
      const { clientWidth: width, clientHeight: height } = container;
      if (!width || !height) return;
      const pixels = Math.min(480 / width, 270 / height, 1);
      renderer.setSize(Math.round(width * pixels), Math.round(height * pixels), false);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1.15 ? 62 : 56;
      camera.updateProjectionMatrix();
      handCamera.left = -camera.aspect;
      handCamera.right = camera.aspect;
      handCamera.updateProjectionMatrix();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const meshes = new Map();
    let alive = true;
    let frame;
    let active;
    let enemyAction;
    let wandAction;
    let lastEnemyCue;
    let lastPlayerCue;
    let previousTime;
    let portrait;
    let portraitUnavailable = false;
    let impactAsset;
    let impacts;
    let lastImpact;
    let lastGuardTurn;
    let guardTint;
    let wardAge = Infinity;
    let lastShatterTurn;
    let shatterAge = Infinity;
    let lastPlayerGuardTurn;
    let playerWardAge = Infinity;
    let previousYaw = 0;
    let previousPitch = 0;
    let projectedAim = "";
    const reduced = reduceMotion();
    function project(point) {
      aimTarget.copy(point).applyMatrix4(camera.matrixWorldInverse);
      if (aimTarget.z >= -.08) return [aimTarget.x < 0 ? "-25%" : "125%", "50%", false];
      aimTarget.applyMatrix4(camera.projectionMatrix);
      const x = T.MathUtils.clamp(50 + 50 * aimTarget.x, -25, 125);
      const y = T.MathUtils.clamp(50 - 50 * aimTarget.y, -25, 125);
      return [x.toFixed(2) + "%", y.toFixed(2) + "%", x > 4 && x < 96 && y > 3 && y < 97];
    }
    function draw(time) {
      frame = requestAnimationFrame(draw);
      const { element, player, pose, playerAction, impact, guard, playerGuard, focus, shieldBroken, turn, paused } = current.current;
      const { yaw, pitch } = view.current;
      const delta = paused || previousTime === undefined ? 0 : Math.min(.25, (time - previousTime) / 1000);
      previousTime = time;
      if (!player) lastGuardTurn = undefined;
      if (guard && turn !== lastGuardTurn) {
        lastGuardTurn = turn;
        guardTint = wandColors[guard];
        wardAge = 0;
      } else if (!player || turn > lastGuardTurn + 1) {
        wardAge = Infinity;
      }
      wardAge += delta;
      if (shieldBroken && turn !== lastShatterTurn) {
        lastShatterTurn = turn;
        shatterAge = 0;
      } else if (!shieldBroken) {
        lastShatterTurn = undefined;
        shatterAge = Infinity;
      }
      shatterAge += delta;
      ward.show(shieldBroken ? Infinity : wardAge, guardTint, reduced);
      ward.shatter(shatterAge, focus?.color, reduced);
      const guardStatus = ward.group.visible ? "active" : "inactive";
      if (container.dataset.enemyGuard !== guardStatus) container.dataset.enemyGuard = guardStatus;
      if (playerGuard && turn !== lastPlayerGuardTurn) {
        lastPlayerGuardTurn = turn;
        // The defense has already resolved, so skip the ward's windup.
        playerWardAge = .34;
      } else if (!playerGuard) {
        lastPlayerGuardTurn = undefined;
        playerWardAge = Infinity;
      }
      playerWardAge += delta;
      playerWard.show(playerWardAge, wandColors[playerGuard], reduced);
      const playerGuardStatus = playerWard.group.visible ? "active" : "inactive";
      if (container.dataset.playerGuard !== playerGuardStatus) container.dataset.playerGuard = playerGuardStatus;
      if (impacts && impact?.id !== lastImpact) {
        if (impact) {
          impacts.play(impact);
          container.dataset.impact = `${impact.target}:${impact.elements.join(",")}`;
        } else {
          delete container.dataset.impact;
        }
        lastImpact = impact?.id;
      }
      impacts?.update(delta);
      const playerCue = playerAction && `${turn}:${playerAction}`;
      if (playerCue !== lastPlayerCue) {
        wandAction = changeClip(wandAction, handActions.get(playerAction));
        lastPlayerCue = playerCue;
      }
      handMixer.update(delta);
      const casting = playerAction === "cast" || playerAction === "counter";
      const damage = playerAction === "damage" || playerAction === "elimination";
      const hitTime = damage ? wandAction?.time ?? 0 : 0;
      const recoil = damage && !reduced ? Math.sin(hitTime * 23) * Math.max(0, 1 - hitTime / .36) : 0;
      camera.rotation.set(restingPitch + pitch + recoil * .065, -yaw, recoil * .038);
      camera.updateMatrixWorld();
      const [targetX, targetY] = project(opponent);
      const [barX, barY, showBar] = project(opponentVitals);
      const projection = targetX + targetY + barX + barY + showBar;
      if (projectedAim !== projection) {
        const arena = container.parentElement;
        arena.style.setProperty("--enemy-x", targetX);
        arena.style.setProperty("--enemy-y", targetY);
        arena.style.setProperty("--enemy-bar-x", barX);
        arena.style.setProperty("--enemy-bar-y", barY);
        arena.style.setProperty("--enemy-bar-visibility", showBar ? "visible" : "hidden");
        projectedAim = projection;
      }
      const next = meshes.get(element);
      if (active !== next) {
        if (active) active.model.visible = false;
        enemyAction = changeClip(enemyAction);
        active = next;
        if (active) active.model.visible = true;
        lastEnemyCue = null;
      }
      if (active) {
        const clip = enemyClips[pose];
        const cue = pose === "idle" ? pose : `${pose === "defend" ? lastGuardTurn : turn}:${pose}`;
        if (lastEnemyCue !== cue) {
          enemyAction = changeClip(enemyAction, active.actions.get(`${element}-${clip}`), pose === "idle");
          lastEnemyCue = cue;
        }
        active.mixer.update(delta);
      }
      const tint = wandColors[player] ?? wandColors.lightning;
      jewel.color.set(focus?.color ?? tint);
      jewel.emissive.copy(jewel.color);
      const castGlow = casting ? 2.5 * Math.sin(Math.min(1, (wandAction?.time ?? 0) / .55) * Math.PI) : 0;
      const glow = focus?.glow ?? 0;
      jewel.emissiveIntensity = .75 + glow * .23 + castGlow;
      tipLight.color.copy(jewel.color);
      tipLight.intensity = glow * .36;
      halo.visible = glow > 0;
      halo.material.color.copy(jewel.color);
      halo.material.opacity = .22 + glow * .09;
      halo.scale.setScalar(.25 + glow * .07);
      wand.rotation.z = reduced ? 0 : T.MathUtils.lerp(wand.rotation.z, (yaw - previousYaw) * 2.5, .24);
      wand.rotation.x = reduced ? 0 : T.MathUtils.lerp(wand.rotation.x, (pitch - previousPitch) * 2.5, .24);
      wand.position.y = T.MathUtils.lerp(wand.position.y, casting ? -.93 : -1.02, .18);
      previousYaw = yaw;
      previousPitch = pitch;

      renderer.autoClear = true;
      renderer.render(stage, camera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(foreground, handCamera);

      const portraitTarget = portraitHost.current;
      if (portrait && portrait.host !== portraitTarget) {
        portrait.dispose();
        portrait = null;
      }
      const head = meshes.get(player)?.head;
      if (portraitTarget && head && !portraitUnavailable) {
        if (!portrait) {
          try { portrait = createWizardPortrait(portraitTarget); }
          catch { portraitUnavailable = true; }
        }
        const state = damage ? playerAction : "idle";
        portrait?.draw(head, state, turn, delta);
      }
    }

    const loader = new GLTFLoader();
    loader.loadAsync(directory + "elemental-impacts.glb").then((asset) => {
      if (!alive) {
        dispose(asset.scene);
        return;
      }
      impactAsset = asset;
      impacts = createImpactPlayer(asset, enemyImpactTarget, playerImpactTarget);
    }).catch(() => {});
    async function load(file) {
      const result = await loader.loadAsync(directory + file);
      const { scene } = result;
      if (alive) stage.add(scene);
      else dispose(scene);
      return result;
    }
    Promise.all([load("violet-arena.glb"), load("elemental-wizards.glb")]).then(([environment, wizards]) => {
      if (!alive) return;
      const sky = environment.scene.getObjectByName("Night_sky");
      if (sky?.material) {
        sky.material.dispose();
        sky.material = new T.ShaderMaterial({
          side: T.BackSide,
          uniforms: {
            zenith: { value: new T.Color(0x26143d) },
            horizon: { value: new T.Color(0x7849a2) },
          },
          vertexShader: "varying vec3 skyDir; void main(){skyDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
          fragmentShader: "uniform vec3 zenith; uniform vec3 horizon; varying vec3 skyDir; void main(){float h=smoothstep(0.0,0.58,skyDir.y);gl_FragColor=vec4(mix(horizon,zenith,h),1.0);\n#include <colorspace_fragment>\n}",
        });
      }
      for (const wizard of wizards.scene.children) {
        wizard.position.x = 0;
        wizard.position.y = .02;
        wizard.visible = false;
        const mixer = new T.AnimationMixer(wizard);
        const clips = wizards.animations.filter(clip => clip.name.startsWith(`${wizard.name}-`));
        const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
        const head = wizard.getObjectByName(`${wizard.name}-head`);
        meshes.set(wizard.name, { model: wizard, mixer, actions, head });
      }
      draw(performance.now());
      container.dataset.ready = "true";
    }).catch(() => {
      if (alive) container.dataset.failed = "true";
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      portrait?.dispose();
      impacts?.dispose();
      if (impactAsset) dispose(impactAsset.scene);
      handMixer.stopAllAction();
      for (const { mixer } of meshes.values()) mixer.stopAllAction();
      dispose(stage);
      dispose(foreground);
      halo.material.dispose();
      haloTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [view, portraitHost]);

  return <div className="duel-scene" ref={host} aria-hidden="true" />;
}
