import { Eip7702Benchmark } from './components/Eip7702Benchmark';
import { BiconomyProvider } from './context/BiconomyContext';

function App() {
  return (
    <BiconomyProvider>
      <Eip7702Benchmark />
    </BiconomyProvider>
  )
}

export default App
