import { Eip7702Initialization } from './components/Eip7702Initialization';
import { InitializeSmartSessions } from './components/InitializeSmartSessions';
import { MultiStepTransactionBenchmark } from './components/MultiStepTransactionBenchmark';
import { BiconomyProvider } from './context/BiconomyContext';
import { ExpandableSection } from './components/ExpandableSection';
import { RuntimeInjectionBenchmark } from './components/RuntimeInjectionBenchmark';
import { SessionMultiStepBenchmark } from './components/SessionMultiStepBenchmark';
import { SessionUAPMultiStepBenchmark1 } from './components/SessionUAPMultiStepBenchmark1';
import { SessionUAPMultiStepBenchmark2 } from './components/SessionUAPMultiStepBenchmark2';
import { SessionUAPMultiStepBenchmark3 } from './components/SessionUAPMultiStepBenchmark3';
import { SessionUAPMultiStepBenchmark4 } from './components/SessionUAPMultiStepBenchmark4';
import { SessionUAPMultiStepBenchmark5 } from './components/SessionUAPMultiStepBenchmark5';

function App() {
  return (
    <BiconomyProvider>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>Biconomy Benchmark Suite</h1>

        <ExpandableSection title="1. Initialize Nexus (EIP-7702)" defaultOpen={true}>
          <Eip7702Initialization />
        </ExpandableSection>

        <ExpandableSection title="2. Smart Session Setup" defaultOpen={false}>
          <InitializeSmartSessions />
        </ExpandableSection>

        <ExpandableSection title="3. Batch Transaction (Multi-Step)" defaultOpen={false}>
          <MultiStepTransactionBenchmark />
        </ExpandableSection>

        <ExpandableSection title="4. Runtime Injection (Sweep)">
          <RuntimeInjectionBenchmark />
        </ExpandableSection>

        <ExpandableSection title="5. Session Multi-Step (Sudo)">
          <SessionMultiStepBenchmark />
        </ExpandableSection>

        <ExpandableSection title="6. UAP 10 USDC Limit">
          <SessionUAPMultiStepBenchmark1 />
        </ExpandableSection>

        <ExpandableSection title="7. Sudo + 1 Min Time Limit">
          <SessionUAPMultiStepBenchmark2 />
        </ExpandableSection>

        <ExpandableSection title="8. Multi-Chain (Simulated)">
          <SessionUAPMultiStepBenchmark3 />
        </ExpandableSection>

        <ExpandableSection title="9. Usage Limit (Max 3)">
          <SessionUAPMultiStepBenchmark4 />
        </ExpandableSection>

        <ExpandableSection title="10. UAP + 5 Min Time Limit">
          <SessionUAPMultiStepBenchmark5 />
        </ExpandableSection>
      </div>
    </BiconomyProvider>
  )
}

export default App
