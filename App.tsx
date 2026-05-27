

import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";

const RPC = "https://api.mainnet-beta.solana.com";

const rpc = async (method: string, params: any[]) => {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
};

const getTokens = async (addr: string) => {
  const result = await rpc("getTokenAccountsByOwner", [
    addr,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" },
  ]);
  return (result.value || [])
    .map((a: any) => ({
      mint: a.account.data.parsed.info.mint,
      amount: a.account.data.parsed.info.tokenAmount.uiAmount,
    }))
    .filter((t: any) => t.amount > 0);
};


const getTxns = async (addr: string) => {
  const sigs = await rpc("getSignaturesForAddress", [addr, { limit: 10 }]);
  return sigs.map((s: any) => ({
    sig: s.signature,
    time: s.blockTime,
    ok: !s.err,
  }));
};


export default function App() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  // Helper: shorten address or mint
  const short = (s: string, n = 4) => `${s.slice(0, n)}...${s.slice(-n)}`;

  // Helper: time ago
  const timeAgo = (ts: number) => {
    if (!ts) return "";
    const s = Math.floor(Date.now() / 1000 - ts);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  // Get SOL balance
  const getBalance = async (addr: string) => {
    const result = await rpc("getBalance", [addr]);
    return result.value / 1_000_000_000;
  };

  // Search function
  const search = async () => {
    const addr = address.trim();
    if (!addr) return Alert.alert("Enter a wallet address");
    setLoading(true);
    try {
      const [bal, tok, tx] = await Promise.all([
        getBalance(addr),
        getTokens(addr),
        getTxns(addr),
      ]);
      setBalance(bal);
      setTokens(tok);
      setTxns(tx);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>SolScan Lite</Text>
        <Text style={s.subtitle}>Solana Wallet Balance Checker</Text>
        <TextInput
          style={s.input}
          placeholder="Solana wallet address..."
          placeholderTextColor="#555"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={s.btn} onPress={search} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={s.btnText}>Search</Text>
          )}
        </TouchableOpacity>

        {/* Balance Card */}
        {balance !== null && (
          <View style={s.card}>
            <Text style={s.label}>SOL Balance</Text>
            <Text style={s.balance}>{balance.toFixed(4)}</Text>
            <Text style={s.sol}>SOL</Text>
            <Text style={s.addr}>{short(address.trim(), 6)}</Text>
          </View>
        )}

        {/* Token List */}
        {tokens.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Tokens</Text>
            <FlatList
              data={tokens}
              keyExtractor={(t) => t.mint}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <Text style={s.mint}>{short(item.mint, 6)}</Text>
                  <Text style={s.amount}>{item.amount}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* Transaction List */}
        {txns.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <FlatList
              data={txns}
              keyExtractor={(t) => t.sig}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.row, { opacity: item.ok ? 1 : 0.5 }]}
                  onPress={() => Linking.openURL(`https://solscan.io/tx/${item.sig}`)}
                >
                  <Text style={s.mint}>{short(item.sig, 6)}</Text>
                  <Text style={s.amount}>{timeAgo(item.time)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0a0a1a",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 32,
  },
  title: {
    color: "#14F195",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    backgroundColor: "#181825",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#22223b",
  },
  btn: {
    backgroundColor: "#14F195",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  btnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  card: {
    backgroundColor: "#181825",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  sol: {
    color: "#14F195",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  addr: {
    color: "#888",
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#14F195",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f0f23",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  mint: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "monospace",
  },
  amount: {
    color: "#14F195",
    fontWeight: "bold",
    fontSize: 15,
    fontFamily: "monospace",
  },
});
