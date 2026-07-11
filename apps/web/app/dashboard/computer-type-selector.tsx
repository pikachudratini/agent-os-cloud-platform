'use client';

import { useState } from 'react';

export type ComputerTypeOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
  providerName: string;
  networkType: string;
  recommended: boolean;
};

const computerTypes: ComputerTypeOption[] = [
  {
    id: 'linux-coding',
    label: 'Linux Coding Minion',
    description: 'Headless Linux server for coding, research, downloads, processing, and automation. No browser desktop.',
    icon: 'terminal',
    providerName: 'remote_ssh',
    networkType: 'datacenter',
    recommended: false,
  },
  {
    id: 'linux-browser',
    label: 'Linux Browser Minion',
    description: 'Linux with visible Chrome desktop for Email Game Changers and ordinary browser operations. Persistent browser profile.',
    icon: 'chrome',
    providerName: 'remote_ssh',
    networkType: 'datacenter',
    recommended: true,
  },
  {
    id: 'windows-desktop',
    label: 'Windows Desktop Minion',
    description: 'Windows desktop for Windows-specific applications and conventional RDP workflows.',
    icon: 'windows',
    providerName: 'remote_ssh',
    networkType: 'datacenter',
    recommended: false,
  },
  {
    id: 'residential-browser',
    label: 'Residential Browser Minion',
    description: 'Computer with a dedicated static residential IP for Facebook and media blocked from datacenter networks. Includes WebRTC and DNS leak protection.',
    icon: 'shield',
    providerName: 'remote_ssh',
    networkType: 'residential_static',
    recommended: false,
  },
];

const networkTypes = [
  { id: 'datacenter', label: 'Datacenter', description: 'Standard datacenter IP. Fine for EGC, coding, and research. Not ideal for Facebook.' },
  { id: 'residential_static', label: 'Static Residential', description: 'Dedicated residential IP. Best for Facebook and blocked media. Requires separate proxy provider.' },
  { id: 'vpn_tunnel', label: 'VPN Tunnel', description: 'Full-device VPN tunnel (WireGuard/OpenVPN). Routes all traffic through a remote connection.' },
  { id: 'direct', label: 'Direct', description: 'No proxy or tunnel. Uses the machine default network.' },
];

export function ComputerTypeSelector({ onSelect }: { onSelect?: (option: ComputerTypeOption) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('datacenter');

  function handleSelect(option: ComputerTypeOption) {
    setSelected(option.id);
    setSelectedNetwork(option.networkType);
    onSelect?.(option);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amber-900">Choose a Computer Type</h2>
        <p className="text-sm text-amber-700 mt-1">Select the type of computer for your Minion. Each type determines what work it can do and how it connects to the internet.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {computerTypes.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selected === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-amber-200 bg-white hover:border-amber-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-900">{option.label}</span>
                  {option.recommended && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Recommended</span>
                  )}
                </div>
                <p className="text-sm text-amber-600 mt-1">{option.description}</p>
              </div>
            </div>
            {selected === option.id && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Selected: Provider={option.providerName}, Network={option.networkType}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Network Type</h3>
        <div className="flex flex-wrap gap-2">
          {networkTypes.map((net) => (
            <button
              key={net.id}
              onClick={() => setSelectedNetwork(net.id)}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                selectedNetwork === net.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
              title={net.description}
            >
              {net.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-amber-500 mt-2">
          {networkTypes.find((n) => n.id === selectedNetwork)?.description}
        </p>
      </div>

      {selected && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900">Configuration Summary</h3>
          <div className="mt-2 space-y-1 text-sm text-amber-700">
            <p>Computer type: {computerTypes.find((c) => c.id === selected)?.label}</p>
            <p>Provider: {computerTypes.find((c) => c.id === selected)?.providerName}</p>
            <p>Network: {selectedNetwork}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded">SSH host required</span>
            <span className="text-xs bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded">Hermes auto-install</span>
            <span className="text-xs bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded">Browser profile deployed</span>
            <span className="text-xs bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded">tmux supervisor</span>
            {selectedNetwork === 'residential_static' && (
              <>
                <span className="text-xs bg-white border border-red-300 text-red-600 px-2 py-1 rounded">WebRTC disabled</span>
                <span className="text-xs bg-white border border-red-300 text-red-600 px-2 py-1 rounded">DNS leak protection</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
