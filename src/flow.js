const sqrt3 = Math.sqrt(3);

let G = [];  // Y行列の実部
let B = [];  // Y行列の虚部

let A_PQUnknown = [];
let A_PVUnknown = [];
let invA_PQUnknown = [];
let invA_PVUnknown = [];

let b = [];

/**
 * 各素子のアドミタンスを記した配列から、アドミタンス行列Yを求め、連立方程式を解く逆行列を生成
 * @param {number[][]} admitancesRe 各素子のアドミタンスの実部
 * @param {number[][]} admitancesIm 各素子のアドミタンスの虚部
 */
export function calcYMatrix(admitancesRe, admitancesIm) {
  // アドミタンス行列の算出
  for (let ix = 0; ix < admitancesRe.length; ix++) {
    G[ix] = [];
    B[ix] = [];
    for (let iy = 0; iy < admitancesRe.length; iy++) {
      if (ix === iy) {
        // 全部たす
        G[ix][iy] = admitancesRe[ix].reduce((sum, element) => sum + element, 0)
        B[ix][iy] = admitancesIm[ix].reduce((sum, element) => sum + element, 0)
      } else {
        G[ix][iy] = - admitancesRe[ix][iy];
        B[ix][iy] = - admitancesIm[ix][iy];
      }
    }
  }

  // b の初期化
  for (let i=0; i<6; i++) {
    b[i] = [0];
  }

  // 逆行列計算
  A_PQUnknown = [
    [1, 0, -G[0][1],  B[0][1], 0, 0],
    [0, 1, -B[0][1], -G[0][1], 0, 0],
    [0, 0, -G[1][1],  B[1][1], 0, 0],
    [0, 0, -B[1][1], -G[1][1], 0, 0],
    [0, 0, -G[2][1],  B[2][1], 1, 0],
    [0, 0, -B[2][1], -G[2][1], 0, 1]
  ];
  invA_PQUnknown = math.inv(A_PQUnknown);
}

/**
 * I0, V1, I2 を未知数として、回路計算を行い各点の電圧および電流を求める
 * @param {number[]} V0 発電所出力電圧[pu]. [e, f]のArray
 * @param {number[]} I1 変電所消費電流[pu]
 * @param {number[]} V2 受電端電圧[pu]. [e, f]のArray
 * @param {number[][]} G アドミタンス行列の実部
 * @param {number[][]} B アドミタンス行列の虚部
 * @return {number[][]} `[I0, V1, I2]` `I0`:発電所出力電流[pu], `V1`:変電所2次側電圧[pu], `I2`:需要家消費電流[pu]
 */
export function flowPQUnknown(V0, I1, V2) {
  for (let i=0; i<3; i++) {
    b[2*i  ][0] = G[i][0]*V0[0] - B[i][0]*V0[1] + G[i][2]*V2[0] - B[i][2]*V2[1];
    b[2*i+1][0] = B[i][0]*V0[0] + G[i][0]*V0[1] + B[i][2]*V2[0] + G[i][2]*V2[1];
  }
  b[2][0] = b[2][0] - I1[0];
  b[3][0] = b[3][0] - I1[1];

  const x = math.multiply(invA_PQUnknown, b);
  return [  // [[I0d, I0q], [e1, f1], [I2d, I2q]] の形で返す
    [x[0], x[1]],
    [x[2], x[3]],
    [x[4], x[5]]
  ];
}
