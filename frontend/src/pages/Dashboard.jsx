import ProposalCard from "../components/ProposalCard";
import UserPanel from "../components/UserPanel";
import { proposals } from "../mock/data";

export default function Dashboard({ user }) {
  return (
    <div className="px-8 py-6">

      <h1 className="text-3xl font-bold text-cyan-400">
        Governance Dashboard
      </h1>
      <p className="text-gray-400 mt-1">
        Connect your wallet to participate
      </p>

      <div className="flex gap-6 mt-6">

        {/* LEFT */}
        <div className="flex-1 space-y-4">

          <h2 className="text-xl">Proposals</h2>

          {!user ? (
            <div className="bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Connect your wallet to view proposals
            </div>
          ) : (
            proposals.map(p => (
              <ProposalCard key={p.id} proposal={p} />
            ))
          )}

        </div>

        {/* RIGHT */}
        <UserPanel user={user} />
      </div>
    </div>
  );
}