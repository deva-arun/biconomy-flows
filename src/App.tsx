import { Eip7702Benchmark } from './components/Eip7702Benchmark';
import { TransactionBenchmark } from './components/TransactionBenchmark';
import { MultiStepTransactionBenchmark } from './components/MultiStepTransactionBenchmark';
import { BiconomyProvider } from './context/BiconomyContext';
import { ExpandableSection } from './components/ExpandableSection';

function App() {
  return (
    <BiconomyProvider>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>Biconomy Benchmark Suite</h1>

        <ExpandableSection title="1. Authorize (EIP-7702)" defaultOpen={true}>
          <Eip7702Benchmark />
        </ExpandableSection>

        <ExpandableSection title="2. Execute Transaction" defaultOpen={false}>
          <TransactionBenchmark />
        </ExpandableSection>

        <ExpandableSection title="3. Batch Transaction (Multi-Step)" defaultOpen={false}>
          <MultiStepTransactionBenchmark />
        </ExpandableSection>
      </div>
    </BiconomyProvider>
  )
}

export default App
