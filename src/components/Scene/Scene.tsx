import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDoubleDown } from "phosphor-react";
import { Suspense, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";

// Styled Components
const Container = styled.div`
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  position: relative;
  -webkit-overflow-scrolling: touch;
`;

const SceneWrapper = styled.div`
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #87ceeb, #5aaccd);
  scroll-snap-align: start;
  position: relative;
`;

const SecondSection = styled.div`
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #5aaccd, #2e5c7a);
  scroll-snap-align: start;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 2rem;
`;

const ContactSection = styled.div`
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #2e5c7a, #0a1c2e);
  scroll-snap-align: start;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  padding: 2rem;
  text-align: center;
`;

const SectionText = styled.h1`
  width: 100%;
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4rem 2rem;
  text-align: center;
  color: #ffffff;
  pointer-events: none;
  font-size: 2rem;
`;

const SectionContent = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: center;
`;

const SlideshowWrapper = styled.div`
  position: relative;
  height: 2.5rem;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin-top: 1rem;
`;

const ScrollIconWrapper = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  color: white;
  cursor: pointer;
  touch-action: manipulation;
  opacity: 0.7;
  transition: opacity 0.2s ease-in-out;

  &:hover {
    opacity: 1;
  }
`;

const ContactText = styled.h2`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const ContactDetails = styled.p`
  font-size: 1.25rem;
  margin: 0.25rem 0;
  color: #d0e6f7;
  font-weight: bold;
`;

const Icon = styled.div<{ atBottom: boolean }>`
  display: flex;
  transform: rotate(${(props) => (props.atBottom ? 180 : 0)}deg);
  transition: transform 0.15s ease-in-out;
  will-change: transform;
`;

function SceneModel() {
  const earthGltf = useGLTF("/low_poly_planet_earth/scene.gltf");
  const modelRef = useRef<THREE.Object3D>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouse = useRef(new THREE.Vector2(0, 0));
  const raycaster = useRef(new THREE.Raycaster());
  const rotationSpeed = useRef(0.004);

  const uniforms = useRef({
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uHoverStrength: { value: 0.05 },
    uHoverRadius: { value: 0.2 },
    uTexture: { value: null as THREE.Texture | null },
    uAmbientLightColor: { value: new THREE.Color("#b3cde0") },
    uAmbientLightIntensity: { value: 0.5 },
    uDirectionalLightColor: { value: new THREE.Color("#fff5e6") },
    uDirectionalLightDirection: {
      value: new THREE.Vector3(10, 20, 10).normalize(),
    },
    uDirectionalLightIntensity: { value: 1.2 },
    uSpecularStrength: { value: 0.3 },
  });

  useEffect(() => {
    earthGltf.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        uniforms.current.uTexture.value = child.material.map;
      }
    });
  }, [earthGltf]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isHovered) return;
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isHovered]);

  useFrame(({ camera }) => {
    if (modelRef.current) {
      raycaster.current.setFromCamera(mouse.current, camera);
      const intersects = raycaster.current.intersectObject(
        modelRef.current,
        true
      );

      if (intersects.length > 0 && isHovered) {
        uniforms.current.uMouse.value.copy(intersects[0].point);
        uniforms.current.uHoverStrength.value = 0.05;
      } else {
        uniforms.current.uHoverStrength.value = 0.0;
      }

      const targetSpeed = isHovered ? 0.001 : 0.004;
      rotationSpeed.current = THREE.MathUtils.lerp(
        rotationSpeed.current,
        targetSpeed,
        0.05
      );

      modelRef.current.rotation.y += rotationSpeed.current;
    }
  });

  const vertexShader = `
    uniform vec3 uMouse;
    uniform float uHoverStrength;
    uniform float uHoverRadius;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;

      vec3 worldPos = vPosition;
      float distance = length(worldPos - uMouse);
      float displacement = uHoverStrength * exp(-distance / uHoverRadius);
      vec3 displacedPosition = position + normal * displacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTexture;
    uniform vec3 uAmbientLightColor;
    uniform float uAmbientLightIntensity;
    uniform vec3 uDirectionalLightColor;
    uniform vec3 uDirectionalLightDirection;
    uniform float uDirectionalLightIntensity;
    uniform float uSpecularStrength;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec4 texColor = texture2D(uTexture, vUv);

      vec3 ambient = uAmbientLightColor * uAmbientLightIntensity * texColor.rgb;
      vec3 norm = normalize(vNormal);
      float diff = max(dot(norm, uDirectionalLightDirection), 0.0);
      vec3 diffuse = uDirectionalLightColor * diff * uDirectionalLightIntensity * texColor.rgb;
      vec3 viewDir = normalize(-vPosition);
      vec3 halfDir = normalize(uDirectionalLightDirection + viewDir);
      float spec = pow(max(dot(norm, halfDir), 0.0), 32.0);
      vec3 specular = uDirectionalLightColor * spec * uSpecularStrength;
      vec3 finalColor = ambient + diffuse + specular;
      finalColor = finalColor / (finalColor + vec3(1.0));
      finalColor = pow(finalColor, vec3(1.0 / 2.2));

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `;

  useEffect(() => {
    earthGltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.ShaderMaterial({
          uniforms: uniforms.current,
          vertexShader,
          fragmentShader,
        });
      }
    });
  }, [earthGltf]);

  return (
    <Center>
      <primitive
        object={earthGltf.scene}
        ref={modelRef}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      />
    </Center>
  );
}

export default function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [wordSwap, setWordSwap] = useState(true);

  const sections = ["home", "about", "contact"];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordSwap((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const slideshowWords = [
    "Creative Mind",
    "Creator",
    "Idea Maker",
    "Problem Solver",
    "Builder",
    "Thinker",
  ];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex(
        (prevIndex) => (prevIndex + 1) % slideshowWords.length
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = window.innerHeight;
      const sectionIndex = Math.round(scrollTop / sectionHeight);
      setCurrentSection(
        Math.min(Math.max(sectionIndex, 0), sections.length - 1)
      );
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [sections.length]);

  const scrollToSection = () => {
    if (containerRef.current) {
      const nextSection =
        currentSection === sections.length - 1
          ? 0
          : Math.min(currentSection + 1, sections.length - 1);
      containerRef.current.scrollTo({
        top: nextSection * window.innerHeight,
        behavior: "smooth",
      });
      setCurrentSection(nextSection);
    }
  };

  return (
    <Container ref={containerRef}>
      <SceneWrapper>
        <h1 style={{ position: "absolute", top: 0, padding: "1rem 2rem" }}>
          joel erlandsson
        </h1>

        <SectionText>
          explore my wor
          <span
            style={{
              display: "inline-block",
              width: "2ch",
              position: "relative",
              height: "2.25rem",
              overflow: "hidden",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={wordSwap ? "ld" : "k"}
                initial={{ y: 25, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{ position: "absolute", left: 0 }}
              >
                {wordSwap ? "ld" : "k"}
              </motion.span>
            </AnimatePresence>
          </span>
        </SectionText>

        <Canvas camera={{ position: [0, 5, 5], fov: 50 }}>
          <ambientLight intensity={0.3} color="#b3cde0" />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            color="#fff5e6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <Suspense fallback={null}>
            <SceneModel />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </SceneWrapper>

      <SecondSection>
        <SectionText>about</SectionText>
        <SectionContent>
          <h1>I'm a</h1>
          <SlideshowWrapper>
            <AnimatePresence mode="wait">
              <motion.p
                key={slideshowWords[currentWordIndex]}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: "absolute",
                  fontSize: "2rem",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {slideshowWords[currentWordIndex]}
              </motion.p>
            </AnimatePresence>
          </SlideshowWrapper>
        </SectionContent>
      </SecondSection>

      <ContactSection>
        <SectionText>contact</SectionText>
        <ContactText>Let's get in touch!</ContactText>
        <ContactDetails>
          <a href="mailto:erlandssonjoel@icloud.com">
            erlandssonjoel@icloud.com
          </a>
        </ContactDetails>
        <ContactDetails>
          <a href="https://www.linkedin.com/in/joel-erlandsson-32500328a/">
            LinkedIn
          </a>
        </ContactDetails>
        <ContactDetails>
          <a href="https://github.com/jolley34">GitHub</a>
        </ContactDetails>
      </ContactSection>

      <ScrollIconWrapper onClick={scrollToSection}>
        <Icon atBottom={currentSection === sections.length - 1}>
          <CaretDoubleDown size={32} weight="bold" />
        </Icon>
      </ScrollIconWrapper>
    </Container>
  );
}
