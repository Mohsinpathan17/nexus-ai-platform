export default function CoreLights() {
  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[-3, 5, 4]} intensity={2.8} color="#f3f0ff" />
      <pointLight position={[2, 3, 4]} intensity={25} color="#b9b0ff" />
      <pointLight position={[-3, -2, 2]} intensity={12} color="#5677ff" />
    </>
  );
}
