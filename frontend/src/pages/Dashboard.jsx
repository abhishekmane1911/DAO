import ProposalCard from "../components/ProposalCard";
import UserPanel from "../components/UserPanel";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ user, proposals }) {
  const navigate = useNavigate();

  return (
    <div className="px-8 py-6">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            Governance Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Participate in decentralized decision making
          </p>
        </div>

        {user && (
          <button
            onClick={() => navigate("/create")}
            className="bg-cyan-500 text-black px-4 py-2 rounded-lg hover:cursor-pointer"
          >
            + Create Proposal
          </button>
        )}
      </div>

      <div className="flex gap-6 mt-6">

        <div className="flex-1 space-y-4">
          <h2 className="text-xl">Proposals</h2>

          {!user ? (
            <div className="bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Connect your wallet to view proposals
            </div>
          ) : (
            proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))
          )}
        </div>

        <UserPanel user={user} />
      </div>
    </div>
  );
}