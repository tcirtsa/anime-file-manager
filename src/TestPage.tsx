function TestPage() {
  const handleClick = () => {
    console.log('Button clicked!');
    alert('Button works!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Button Test</h1>
      <button onClick={handleClick} style={{ padding: '10px 20px', margin: '10px' }}>
        Simple Button Test
      </button>
      <button 
        onClick={() => console.log('Inline handler works')}
        style={{ padding: '10px 20px', margin: '10px' }}
      >
        Inline Handler Test
      </button>
    </div>
  );
}

export default TestPage;