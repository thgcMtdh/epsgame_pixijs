// レイアウトを決める定数
const height = 360;  // 高さ(固定)
const MAXWIDTH = 640;  // Applicationの最大幅
const MARGIN = 10;  // 横幅のmargin調整用
const FULLRANGE = 1.5;  // 横幅いっぱい=何pu?

// ウィンドウサイズを取得し、widthを決定
let width = window.innerWidth;
if (width > MAXWIDTH) {
    width = MAXWIDTH;
}
width = width - MARGIN;

// 1puを何pxとして表示するか? の換算係数
const pxPerPu = width / FULLRANGE;

// PIXI.Applicationを生成
let app = new PIXI.Application({
    width: width,
    height: height,
    // backgroundColor: 0x1099bb
});

// HTMLにcanvasを追加
document.getElementById('app').appendChild(app.view);

// ステージ保存領域
const gameStages = {};
let currentStage = null;

/**
 * フェーザ図で使う矢印を表す
 */
class Arrow {
    /**
     * コンストラクタ
     * @param {number} x1 始点のx座標
     * @param {number} y1 始点のy座標
     * @param {number} x2 終点のx座標
     * @param {number} y2 終点のy座標
     * @param {number} width 線の幅[px]
     * @param {string} color 色. "orange" または "brown"
     */
    constructor(x1, y1, x2, y2, width, color) {
        this.x1 = x1;  // 始点のx座標[px]
        this.y1 = y1;  // 始点のy座標[px]
        this.len = 0;  // 矢印の長さ[px]
        this.theta = 0;  // x軸正方向から反時計回りに測った回転角[rad]
        this.width = width;

        if (color === "orange") {
            this.line = new PIXI.Sprite(PIXI.Loader.shared.resources["images/rectangleOrange.png"].texture);
        } else if (color === "brown") {
            this.line = new PIXI.Sprite(PIXI.Loader.shared.resources["images/rectangleBrown.png"].texture);
        } else {
            throw "Color is invalid!";
        }
        this.line.anchor.x = 0.0;  // 回転中心の設定
        this.line.anchor.y = 0.5;

        this.setPosition(x1, y1, x2, y2);
        this.update()  // 描画
    }

    /**
     * 矢印の幅を設定する
     * @param {number} width 矢印の線の幅[px]
     */
    setWidth(width) {
        this.width = width;
        this.update();
    }

    /**
     * 矢印の始点と終点を設定する
     * @param {number} x1 始点のx座標
     * @param {number} y1 始点のy座標
     * @param {number} x2 終点のx座標
     * @param {number} y2 終点のy座標
     */
    setPosition(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.len = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
        this.theta = Math.atan2(y2 - y1, x2 - x1);  // 時計回りを正とするので負号
        this.update();
    }

    /**
     * 座標と太さを基に、Spriteのパラメータを更新する
     */
    update() {
        this.line.x = this.x1;
        this.line.y = this.y1;// - this.width / 2;
        this.line.width = this.len;
        this.line.height = this.width;
        this.line.rotation = this.theta;
    }

}

// ステージの定義
class StagePQUnknown {
    constructor() {
        // PixiJS コンテナ
        this.container = new PIXI.Container();
        // 矢印
        this.arrowDemI = new Arrow(0, 0, 200, 200, 10, 'orange');
        this.container.addChild(this.arrowDemI.line);
    }
}

// 画像を読み込んだのち、setupを実行
PIXI.Loader.shared
    .add("images/rectangleBrown.png")
    .add("images/rectangleOrange.png")
    .add("images/triangleBrown.png")
    .add("images/triangleOrange.png")
    .load(setup);

function setup() {
    console.log('start setup()');
    // stage生成: 需要家のP-Qを未知
    let stage = new StagePQUnknown();
    gameStages['PQUnknown'] = stage;
    app.stage.addChild(stage.container);
}
