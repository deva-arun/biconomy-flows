import { Eip7702Benchmark } from './components/Eip7702Benchmark';
import { TransactionBenchmark } from './components/TransactionBenchmark';
import { BiconomyProvider } from './context/BiconomyContext';

function App() {
  return (
    <BiconomyProvider>
      <Eip7702Benchmark />
      <TransactionBenchmark />
    </BiconomyProvider>
  )
}

export default App
