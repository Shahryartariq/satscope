import type { AddressSnapshot, AddressStats, Coin, MarketData } from "./types";
import { parseAddress } from "./address";

/**
 * Data served when SATSCOPE_SAMPLE_DATA=1 (tests, offline demos).
 * The two Taproot wallets are real: coins captured from blockstream.info and
 * inscriptions read from ordinals.com on 2026-11-06 (block 974,802).
 * The payment and legacy wallets are made up to exercise every finding;
 * their addresses come from hashing fixed strings, so no one holds their keys.
 */

type Row = [txid: string, vout: number, value: number, height: number, time: number, inscriptions?: string[]];

function coins(rows: Row[]): Coin[] {
  return rows.map(([txid, vout, value, height, time, ins]) => ({
    txid,
    vout,
    value,
    confirmed: height > 0,
    height: height || undefined,
    time: time || undefined,
    inscriptions: (ins ?? []).map((id) => ({ id })),
    runes: [],
  }));
}

function snap(
  address: string,
  stats: AddressStats,
  list: Coin[],
  extra: Partial<AddressSnapshot> = {},
): AddressSnapshot {
  return {
    address,
    type: parseAddress(address)!,
    role: "single",
    stats,
    coins: list,
    indexed: true,
    runeBalances: [],
    ...extra,
  };
}

export const SAMPLE_COLLECTOR = "bc1pcs8fplulfdqazg4cnds39ssp6ydfxdf5mrvl768pnd79l9ledwgqk4z74m";
export const SAMPLE_SMALL = "bc1pvep9uh9smsr3xln4lql5xx53lmnfm2pxyr3pxvg7anpvu73zz9fqmf8rk3";
export const SAMPLE_PAYMENT = "bc1q80z72mugw2g52utqgd5y9audpae4ghp8atmthm";
export const SAMPLE_LEGACY = "1MVP92Tsqt6ceXzwPAT5vaiQgQToxCwH93";

const collector = snap(
  SAMPLE_COLLECTOR,
  { txCount: 63, receivedSats: 3_472_378, sentSats: 3_000_851, pendingTxCount: 4 },
  coins([
    [
      "e51ff12d10801df3b45e3b6d20bbb11bd6dcd1f93b2a12086f3d13eab4b82c41",
      1,
      330,
      974671,
      1793883881,
      ["bf4c141c6b623d46983401133f7548206db434c46404286c814cf9db9e3685b2i0"],
    ],
    [
      "f3f5bf4399cd02990c88311b20d28ddb84c513748a9229a69d5c53704bdab471",
      0,
      546,
      973475,
      1793147963,
      ["18f8a18136f579fd34da6240236dca141787dd98d1a7db74ac1c2fc58d57c7b4i0"],
    ],
    ["7dcc4bb2fbd73b64da838eba7cfeb63a1c01843eb7607e99788f121d9175f635", 1, 6643, 974716, 1793915200],
    [
      "f29d4e8d7af25bcbad2be6bef6279c41b59eb6f0e8f0d5d2b54ad68027cdf1fe",
      0,
      546,
      932769,
      1768720272,
      ["f8c6ecdb187ab6c6dc03e553b70134fd466e4406c9bed764f354a016f28c5d32i0"],
    ],
    [
      "3c9ac18bedbe9f97f67ed5278d430d384320b5f93a04035e9999cf9070ab1f05",
      0,
      546,
      974800,
      1793960745,
      ["fa302e503bd647fe4ca39dcc7b31aebc02eba17b4195f9dbaaaed8ca28ccd4b3i0"],
    ],
    [
      "17179b0c3ed12a8297dae7b56146f94692b2dd083a074028db72d51d78ab4966",
      0,
      546,
      973567,
      1793197690,
      ["a36c53ce104cbc04186bbc452a0435a6e03ada0ab0b40ddd83c3904d51780994i0"],
    ],
    ["e51ff12d10801df3b45e3b6d20bbb11bd6dcd1f93b2a12086f3d13eab4b82c41", 4, 600, 974671, 1793883881],
    ["47c55e8b547eb87ff2e0e7a4313b25d9447044f992adbcde40614287ea8b5068", 1, 2228, 974716, 1793915200],
    ["f8d0f459882d1415bc41f394d984b35b0ba8bf8a0f919525d30245bd3e736eda", 3, 139873, 974751, 1793931940],
    [
      "9500671b1cc301f5ad95a6346b664857dabd08c3646529a20a6be4394b1f12da",
      0,
      546,
      932767,
      1768719375,
      ["acf0e787bfbd6b3b6f94a4ac95b706fc2fff5a5771028e4f5dcd823ec3279ea1i0"],
    ],
    [
      "1710b4ac52b02ae26a3cac17ed30d9e88c1c7e44cbc9671812302be7824600f2",
      0,
      546,
      974800,
      1793960745,
      ["f873e2e80990f2ec004862f68d66afe7112652afedb6c2357809a49ae7fd1345i0"],
    ],
    ["e51ff12d10801df3b45e3b6d20bbb11bd6dcd1f93b2a12086f3d13eab4b82c41", 5, 600, 974671, 1793883881],
    [
      "fc82c69db9a7ccc04332f463b8389e5d918d4475e13eba6a0aee3cdf777d38a8",
      0,
      546,
      974802,
      1793961236,
      ["fc82c69db9a7ccc04332f463b8389e5d918d4475e13eba6a0aee3cdf777d38a8i0"],
    ],
    [
      "4ff03208a64b9f540f786e6b7a616318375d4fa989a059cf7fc7cca6a016d5ed",
      0,
      546,
      932858,
      1768776678,
      ["b6e3a4e436ca95a737f6d294186886146a5f7d796ffd1d1351259a97cf32a362i0"],
    ],
    [
      "6d9f85d8bd915fbf2609d2aa4a72c4601c2cb1162340f375d6b7ebcba3824a8c",
      0,
      546,
      974801,
      1793961020,
      ["6d9f85d8bd915fbf2609d2aa4a72c4601c2cb1162340f375d6b7ebcba3824a8ci0"],
    ],
    [
      "820b78b0ad2c581278140800138ce54d950f7f0487be0bfbf4a17436b133ee4a",
      0,
      546,
      969956,
      1791175947,
      ["768710dd8dea545a9758d26fad9189d90e84cbc1330d5ea2f14027f849a72001i0"],
    ],
    [
      "03ae587c1f4cee2a79c87470e4f26fc4e9a1af24855d1ed9718102d085c591de",
      0,
      546,
      974801,
      1793961020,
      ["03ae587c1f4cee2a79c87470e4f26fc4e9a1af24855d1ed9718102d085c591dei0"],
    ],
    [
      "8a267080a9f640c608c545eb486a6d29fef32c9c70afa73abdbc8d44db32f9a7",
      0,
      546,
      974802,
      1793961236,
      ["8a267080a9f640c608c545eb486a6d29fef32c9c70afa73abdbc8d44db32f9a7i0"],
    ],
    ["2de7199a193070e3ff9c85b7ca0f3b02a33a007b0fcc0cb76f5fafc37299ab3c", 1, 167123, 0, 0],
    ["862e03bfbcc5717beea8f790bd578ff5e79dceab9a2ff128cb5354402cc0bad5", 0, 546, 0, 0],
    ["b2ffcd201bd9f0569083fb1e2b342133b65b893444ba64e82a68dd065bb10082", 0, 546, 0, 0],
    ["3c9bf866bbaa7574aa563b62c6e1533f7e0db35d3e21d8ab8cf51d999ff7c14f", 1, 146486, 0, 0],
  ]),
);

const small = snap(
  SAMPLE_SMALL,
  { txCount: 5, receivedSats: 20_784, sentSats: 10_000, pendingTxCount: 0 },
  coins([
    ["5b31325f26eecce2132f275f3a35afc7a53e09de956ed96fd1fda47b094438cb", 1, 9362, 974802, 1793961236],
    [
      "1f96db79e8dc066d7ff4f962bc44097e4651df5cd02463976b1dd55ec199b6fa",
      0,
      546,
      974747,
      1793929057,
      ["4502f76e9e06f06ef34546ed061a73604d320af2d260e2ae81ccc9b80d53b769i0"],
    ],
    [
      "afb7d747f0c7a89cac60a998df6a938294f40ee2a4b8fef8349b951b9bae7a36",
      0,
      546,
      974749,
      1793931518,
      ["d21c97b4b20e742efc226aa91017d4f8cbe868cca95c721dc49eaeab232a929ci0"],
    ],
    [
      "be53387a072dcf09c45f63db068f10c59550c5c62ee2c3e330d58ab9ae9bc3f2",
      0,
      330,
      974802,
      1793961236,
      ["be53387a072dcf09c45f63db068f10c59550c5c62ee2c3e330d58ab9ae9bc3f2i0"],
    ],
  ]),
);

/** Deterministic 64-hex txid for made-up coins. */
function fakeTxid(seed: number): string {
  let x = (seed * 2654435761) >>> 0;
  let out = "";
  while (out.length < 64) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

const T0 = 1_790_000_000;
const paymentCoins: Coin[] = [
  ...[48_000, 31_250, 22_100, 15_000, 12_480, 9_900, 8_200, 7_650, 5_000, 4_321, 3_100, 2_500, 1_800, 1_200].map(
    (value, i): Coin => ({
      txid: fakeTxid(100 + i),
      vout: i % 3,
      value,
      confirmed: true,
      height: 970_000 + i * 120,
      time: T0 + i * 72_000,
      inscriptions: [],
      runes: [],
    }),
  ),
  {
    txid: fakeTxid(200),
    vout: 0,
    value: 25_000,
    confirmed: true,
    height: 971_204,
    time: T0 + 500_000,
    inscriptions: [{ id: `${fakeTxid(201)}i0`, number: 98_765_432 }],
    runes: [],
  },
  {
    txid: fakeTxid(210),
    vout: 1,
    value: 546,
    confirmed: true,
    height: 972_010,
    time: T0 + 900_000,
    inscriptions: [
      { id: `${fakeTxid(211)}i0`, number: 101_000_111 },
      { id: `${fakeTxid(211)}i1`, number: 101_000_112 },
    ],
    runes: [{ id: "840000:3", name: "DOG•GO•TO•THE•MOON", amount: "4200000", divisibility: 5, symbol: "🐕" }],
  },
  {
    txid: fakeTxid(220),
    vout: 2,
    value: 546,
    confirmed: true,
    height: 973_500,
    time: T0 + 1_400_000,
    inscriptions: [],
    runes: [{ id: "840000:28", name: "RSIC•GENESIS•RUNE", amount: "1500", divisibility: 0, symbol: "⧉" }],
  },
];

const payment = snap(
  SAMPLE_PAYMENT,
  { txCount: 24, receivedSats: 410_000, sentSats: 210_955, pendingTxCount: 0 },
  paymentCoins,
  {
    runeBalances: [
      { id: "840000:3", name: "DOG•GO•TO•THE•MOON", amount: "4200000", divisibility: 5, symbol: "🐕" },
      { id: "840000:28", name: "RSIC•GENESIS•RUNE", amount: "1500", divisibility: 0, symbol: "⧉" },
    ],
  },
);

const legacy = snap(
  SAMPLE_LEGACY,
  { txCount: 41, receivedSats: 1_250_000, sentSats: 1_050_000, pendingTxCount: 0 },
  [
    {
      txid: fakeTxid(300),
      vout: 0,
      value: 180_000,
      confirmed: true,
      height: 900_100,
      time: T0 - 9_000_000,
      inscriptions: [],
      runes: [],
    },
    {
      txid: fakeTxid(301),
      vout: 1,
      value: 19_454,
      confirmed: true,
      height: 931_000,
      time: T0 - 4_000_000,
      inscriptions: [],
      runes: [],
    },
    {
      txid: fakeTxid(302),
      vout: 0,
      value: 546,
      confirmed: true,
      height: 950_000,
      time: T0 - 1_000_000,
      inscriptions: [],
      runes: [],
    },
  ],
  { indexed: false },
);

/**
 * A wallet whose keys are public: both addresses come from the private key in
 * the BIP-322 test vectors. The end-to-end tests use it with a mock wallet that
 * really signs, so the whole fix flow (build, sign, check, broadcast) is tested.
 * Never send real bitcoin to these addresses; anyone can spend from them.
 */
export const TEST_WALLET_PAYMENT = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
export const TEST_WALLET_ORDINALS = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

const testPayment = snap(
  TEST_WALLET_PAYMENT,
  { txCount: 8, receivedSats: 147_092, sentSats: 0, pendingTxCount: 0 },
  [
    ...[60_000, 35_000, 21_000, 14_500, 9_000, 6_500].map((value, i): Coin => ({
      txid: fakeTxid(400 + i),
      vout: i % 2,
      value,
      confirmed: true,
      height: 973_000 + i * 50,
      time: T0 + 2_000_000 + i * 40_000,
      inscriptions: [],
      runes: [],
    })),
    {
      txid: fakeTxid(420),
      vout: 0,
      value: 546,
      confirmed: true,
      height: 974_100,
      time: T0 + 2_600_000,
      inscriptions: [{ id: `${fakeTxid(421)}i0`, number: 102_345_678 }],
      runes: [],
    },
    {
      txid: fakeTxid(430),
      vout: 1,
      value: 546,
      confirmed: true,
      height: 974_200,
      time: T0 + 2_700_000,
      inscriptions: [],
      runes: [{ id: "840000:3", name: "DOG•GO•TO•THE•MOON", amount: "2500000", divisibility: 5, symbol: "🐕" }],
    },
  ],
  { runeBalances: [{ id: "840000:3", name: "DOG•GO•TO•THE•MOON", amount: "2500000", divisibility: 5, symbol: "🐕" }] },
);

const testOrdinals = snap(TEST_WALLET_ORDINALS, { txCount: 2, receivedSats: 876, sentSats: 0, pendingTxCount: 0 }, [
  {
    txid: fakeTxid(440),
    vout: 0,
    value: 546,
    confirmed: true,
    height: 974_300,
    time: T0 + 2_800_000,
    inscriptions: [{ id: `${fakeTxid(441)}i0`, number: 103_000_001 }],
    runes: [],
  },
  {
    txid: fakeTxid(450),
    vout: 0,
    value: 330,
    confirmed: true,
    height: 974_310,
    time: T0 + 2_810_000,
    inscriptions: [{ id: `${fakeTxid(451)}i0`, number: 103_000_042 }],
    runes: [],
  },
]);

export const SAMPLE_SNAPSHOTS: Record<string, AddressSnapshot> = {
  [SAMPLE_COLLECTOR]: collector,
  [SAMPLE_SMALL]: small,
  [SAMPLE_PAYMENT]: payment,
  [SAMPLE_LEGACY]: legacy,
  [TEST_WALLET_PAYMENT]: testPayment,
  [TEST_WALLET_ORDINALS]: testOrdinals,
};

export const SAMPLE_MARKET: MarketData = {
  fees: { fastest: 3, halfHour: 2, hour: 1, economy: 0.5, minimum: 0.1 },
  usd: 96_000,
  tipHeight: 974_802,
};

export function isSampleMode(): boolean {
  return process.env.SATSCOPE_SAMPLE_DATA === "1";
}
