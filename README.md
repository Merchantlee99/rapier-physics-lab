# Rapier Physics Lab

브라우저에서 바로 돌려보는 3D 물리 엔진 실험실입니다.

Rapier WASM, Three.js, React를 붙여서 만든 프로젝트이고, 단순히 공이 튀고 도미노가 넘어지는 장난감이 아니라 **물리 엔진의 동작을 눈으로 보고, 숫자로 확인하고, 같은 조건에서 다시 재현할 수 있는 도구**로 만들었습니다.

## 영상

![Rapier Physics Lab](./assets/rapier-physics-lab.gif)

## 왜 만들었나

물리 엔진 화면은 보통 보기에는 재밌지만, 막상 만들다 보면 “이게 진짜 엔진 계산 결과인지”, “랜덤하게 잘 된 것처럼 보이는 건 아닌지”, “파라미터를 바꾸면 어떤 기준으로 달라지는지”가 흐려지기 쉽습니다.

그래서 이 프로젝트는 화면을 예쁘게 만드는 쪽보다, 물리 실험을 제대로 관찰하는 쪽에 초점을 뒀습니다.

- 같은 조건으로 리셋하면 같은 결과가 나오는지
- 마찰, 반발, 조인트, 센서, CCD 같은 엔진 기능이 실제로 어떻게 보이는지
- FPS, step time, body count, sleep state 같은 런타임 상태를 바로 읽을 수 있는지
- 사용자가 공을 잡아 끌거나, 충격을 주거나, 중력을 바꿔도 실험 흐름이 무너지지 않는지

말하자면 “3D로 예쁜 물리 장면 하나 만들었다”가 아니라, **Rapier를 가지고 실험 가능한 작은 연구실을 만든 것**에 가깝습니다.

## 어떤 프로젝트인가

8개의 시나리오를 가진 웹 기반 rigid-body physics lab입니다.

왼쪽에서 실험 시나리오를 고르고, 가운데 3D 뷰포트에서 물체를 관찰하고, 오른쪽 패널에서 파라미터와 계측값을 조정합니다. 상단에는 재생, 일시정지, 한 스텝 진행, 리셋, 배속 제어가 있고, 하단 상태바에는 시뮬레이션 시간, step 수, body 수, 상태 해시가 표시됩니다.

핵심은 “보는 것”과 “검증하는 것”을 같이 둔 점입니다.

- **React UI**: 시나리오 선택, 파라미터 조정, inspector, telemetry
- **Three.js / react-three-fiber**: 3D 렌더링, 카메라, 조명, 그리드
- **Rapier 3D WASM**: 실제 rigid-body 물리 계산
- **zustand**: 시나리오, 도구 상태, 이벤트, 파라미터 관리
- **고정 timestep**: 1/60초 단위로 물리 월드를 전진
- **world hash**: 일정 step마다 body transform을 해시로 만들어 재현성 확인

## 시나리오

| 시나리오 | 보는 것 |
| --- | --- |
| **Bounce Lab** | 반발 계수 0.10 -> 0.95 공들을 같은 높이에서 떨어뜨려 비교 |
| **Friction Ramp** | 마찰 계수가 다른 박스들이 경사면에서 미끄러지는 임계점 확인 |
| **Pendulum Wave** | 15개의 revolute joint 진자가 서로 다른 길이로 위상 패턴을 만드는 장면 |
| **Domino Spiral** | 최대 180개 도미노가 한 번의 impulse로 연쇄 반응하는 장면 |
| **Launch Range** | CCD projectile, 포물선 예측선, sensor scoring |
| **Wrecking Ball** | spherical joint chain으로 연결된 추와 벽돌 충돌 |
| **Body Storm** | seeded PRNG로 만든 다수 body를 떨어뜨리며 성능과 sleep 상태 확인 |
| **Sandbox** | spawn, drag, poke, gravity preset을 자유롭게 섞어보는 실험 공간 |

## 실행 방법

```bash
npm install
npm run dev
```

기본 Vite 개발 서버에서 실행됩니다.

```bash
npm run build
```

빌드는 TypeScript 타입 체크와 production bundle 생성을 같이 확인합니다.

## 프로젝트 구조

```text
src/
  App.tsx
  main.tsx

  scenarios/
    Restitution.tsx
    Friction.tsx
    PendulumWave.tsx
    Dominoes.tsx
    Projectile.tsx
    Wrecking.tsx
    Stress.tsx
    Sandbox.tsx
    registry.ts

  three/
    LabCanvas.tsx
    SimulationDriver.tsx
    interactive.ts
    CameraRig.tsx
    SelectionOverlay.tsx

  state/
    store.ts
    engine.ts
    telemetry.ts

  ui/
    TopBar.tsx
    Sidebar.tsx
    RightPanel.tsx
    StatusBar.tsx
    ToolDock.tsx
```

구조는 일부러 단순하게 나눴습니다.

- `scenarios/`는 실험 정의입니다. 각 시나리오는 title, blurb, camera, params, actions, info, Component를 가집니다.
- `three/`는 캔버스와 물리 월드 구동부입니다.
- `state/`는 UI 상태와 Rapier world bridge, telemetry를 담당합니다.
- `ui/`는 실험을 조작하고 읽는 패널입니다.

## 구현하면서 신경 쓴 지점

### 1. 물리 월드를 리셋할 때 진짜 새로 만든다

시나리오를 바꾸거나 리셋하면 `<Physics key={scenarioId:resetNonce}>`를 통해 월드를 다시 마운트합니다. 대충 위치만 되돌리는 방식이 아니라, 같은 조건의 새 월드를 만드는 쪽에 가깝습니다. 그래서 재현성 확인이 더 깔끔합니다.

### 2. UI가 매 프레임 React state를 흔들지 않는다

FPS, step time, kinetic energy, awake body count 같은 값은 `telemetry.ts`의 ring buffer에 쌓고, UI는 낮은 주기로 읽습니다. 물리 시뮬레이션처럼 프레임 단위로 계속 움직이는 화면에서 React rerender를 줄이는 게 중요했습니다.

### 3. 수치가 보이게 만들었다

Inspector에서 body type, mass, position, velocity, friction, restitution 등을 읽을 수 있고, status bar에는 simulation step과 world hash가 나옵니다. 그냥 “움직인다”가 아니라 “지금 어떤 상태인지”를 볼 수 있게 만들었습니다.

### 4. 상호작용도 물리적으로 처리한다

drag는 물체를 순간이동시키는 방식이 아니라 spring impulse로 당깁니다. poke도 impulse로 처리합니다. 사용자가 만지는 동작까지 가능한 한 물리 월드 안에서 설명되게 만들었습니다.

### 5. 성능을 실험 대상으로 넣었다

Body Storm은 예쁜 장면보다 성능 확인용에 가깝습니다. body 수가 늘어날 때 step time과 FPS가 어떻게 바뀌는지 보려고 넣었습니다. 많은 물체는 instanced mesh로 렌더링해서 draw call을 줄였습니다.

## 기술 스택

- Vite
- React 19
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei
- @react-three/rapier
- Rapier 3D WASM
- zustand

## 내가 이 프로젝트에서 보여주고 싶은 것

이 프로젝트는 거창한 서비스라기보다, 엔진과 UI를 묶어서 **검증 가능한 인터랙티브 도구**로 만드는 연습입니다.

AI로 코드를 빠르게 만들 수 있는 시대일수록, “그럴듯하게 움직인다”에서 끝내면 안 된다고 생각합니다. 왜 그렇게 움직이는지, 어떤 파라미터가 결과를 바꾸는지, 같은 조건에서 다시 같은 결과가 나오는지까지 확인해야 실제 작업물로 볼 수 있습니다.

Rapier Physics Lab은 그 기준으로 만든 작은 실험실입니다.
