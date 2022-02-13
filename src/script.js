import { calcYMatrix, flowPQUnknown } from "./flow.js";
import { defaultAdmitancesRe, defaultAdmitancesIm } from "./data.js";

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
const puPerPx = 1.0 / pxPerPu;

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
    static headSize = 20;  // 矢印の頭のサイズ

    /**
     * コンストラクタ
     * @param {number} x1 始点のx座標
     * @param {number} y1 始点のy座標
     * @param {number} x2 終点のx座標
     * @param {number} y2 終点のy座標
     * @param {number} width 線の幅[px]
     * @param {string} color 色. "orange" または "brown"
     * @param {boolean} isDraggable `true`-ドラッグで移動できる `false`-移動不可
     */
    constructor(x1, y1, x2, y2, width, color, isDraggable) {
        this.container = new PIXI.Container();  // 矢印の線と頭を格納したコンテナ

        this.x1 = x1;  // 始点のx座標[px]
        this.y1 = y1;  // 始点のy座標[px]
        this.x2 = x2;  // 終点のx座標[px]
        this.y2 = y2;  // 終点のy座標[px]
        this.len = 0;  // 矢印の長さ[px]
        this.theta = 0;  // x軸正方向から反時計回りに測った回転角[rad]
        this.width = width;  // 矢印の太さ[px]
        this.offset = {x: 0, y: 0};  // クリック位置と矢印先端位置のずれ[px]

        if (color === "orange") {
            this.line = new PIXI.Sprite(PIXI.Loader.shared.resources["images/rectangleOrange.png"].texture);
            this.head = new PIXI.Sprite(PIXI.Loader.shared.resources["images/triangleOrange.png"].texture);
        } else if (color === "brown") {
            this.line = new PIXI.Sprite(PIXI.Loader.shared.resources["images/rectangleBrown.png"].texture);
            this.head = new PIXI.Sprite(PIXI.Loader.shared.resources["images/triangleBrown.png"].texture);
        } else {
            throw "Color is invalid!";
        }

        this.setPosition(x1, y1, x2, y2);
        this.container.addChild(this.line);
        this.container.addChild(this.head);

        if (isDraggable) {
            this.head.interactive = isDraggable;
            this.head.buttonMode = isDraggable;

            // 矢印の先端をマウスでクリックしたとき
            this.head.on('pointerdown', (e) => {
                // クリック位置と矢印先端位置のずれを記録
                const position = e.data.getLocalPosition(app.stage);
                this.offset.x = this.x2 - position.x;
                this.offset.y = this.y2 - position.y;
                // ドラッグ中に位置を変更するイベントを追加
                this.head.on('pointermove', (e) => {
                    const position = e.data.getLocalPosition(app.stage);
                    this.setPosition(this.x1, this.y1, position.x + this.offset.x, position.y + this.offset.y);
                });
                // マウスが離れたときにドラッグをやめる
                this.head.on('pointerup', () => {
                    this.head.off('pointermove');
                    this.head.off('pointerup');
                });
            });
        }
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
        this.x2 = x2;
        this.y2 = y2;
        this.update();
    }

    /**
     * 始点は固定したまま、始点から測ったx,y方向の長さで矢印の終点を設定する
     * @param {number} x 始点からのx方向の長さ[px]
     * @param {number} y 始点からのy方向の長さ[px]
     */
    setEnd(x, y) {
        this.x2 = this.x1 + x;
        this.y2 = this.y1 + y;
        this.update();
    }

    /**
     * 座標と太さにもとづいて、Spriteのパラメータを更新する
     */
    update() {
        this.len = Math.sqrt((this.x2-this.x1)*(this.x2-this.x1) + (this.y2-this.y1)*(this.y2-this.y1));
        this.theta = Math.atan2(this.y2-this.y1, this.x2-this.x1);

        this.line.x = 0;
        this.line.y = - this.width / 2;
        this.line.width = (this.len - Arrow.headSize > 0) ? this.len - Arrow.headSize : 0;
        this.line.height = this.width;

        this.head.x = this.len - Arrow.headSize;
        this.head.y = - Arrow.headSize / 2;
        this.head.width = Arrow.headSize;
        this.head.height = Arrow.headSize;

        this.container.pivot.set(0, 0);
        this.container.x = this.x1;
        this.container.y = this.y1;
        this.container.rotation = this.theta;
    }
}

// ステージの定義
class StagePQUnknown {
    static origin = {x: 10, y: 100};  // 座標軸の原点

    constructor() {
        // 変数
        this.Vbase = 154000;  // 基準線間電圧[V]
        this.Pbase = 100000 * 1000;  // 基準三相電力[W]
        this.admitances = {re: defaultAdmitancesRe, im: defaultAdmitancesIm};
        calcYMatrix(this.admitances.re, this.admitances.im);
        this.genV = [1.05, 0];  // [既知]発電機電圧 [pu]
        this.ssV = [1.04, 0];   // [未知]変電所2次側電圧 [pu]
        this.demV = [1.01, 0];  // [既知]需要家電圧 [pu]
        this.genI = [0, 0];     // [未知]発電機電流 [pu]
        this.ssI = [0, 0];      // [既知]変電所電流[pu]
        this.demI = [0, 0];     // [未知]需要電流 [pu]
        [this.genI, this.ssV, this.demI] = flowPQUnknown(this.genV, this.ssI, this.demV);

        // PixiJS コンテナ
        this.container = new PIXI.Container();

        // 座標軸(需要家の受電端電圧を位相基準とする)
        this.axisX = new PIXI.Graphics();
        this.axisY = new PIXI.Graphics();
        this.axisX.lineStyle(1, 0xffffff)
            .moveTo(StagePQUnknown.origin.x, StagePQUnknown.origin.y)
            .lineTo(1.2 * pxPerPu,           StagePQUnknown.origin.y);
        this.axisY.lineStyle(1, 0xffffff)
            .moveTo(StagePQUnknown.origin.x, StagePQUnknown.origin.y - 50)
            .lineTo(StagePQUnknown.origin.x, StagePQUnknown.origin.y + 50);
        this.container.addChild(this.axisX);
        this.container.addChild(this.axisY);

        // 矢印
        this.arrowDemI = new Arrow(StagePQUnknown.origin.x, StagePQUnknown.origin.y, StagePQUnknown.origin.x + 0, StagePQUnknown.origin.y, 4, 'brown', false);
        this.arrowDemV = new Arrow(StagePQUnknown.origin.x, StagePQUnknown.origin.y, StagePQUnknown.origin.x + 0, StagePQUnknown.origin.y, 4, 'brown', false);
        this.arrowGenV = new Arrow(StagePQUnknown.origin.x, StagePQUnknown.origin.y, StagePQUnknown.origin.x + 0, StagePQUnknown.origin.y, 6, 'orange', true);
        this.arrowDemI.setEnd(this.demI[0] * pxPerPu, this.demI[1] * pxPerPu);
        this.arrowDemV.setEnd(this.demV[0] * pxPerPu, this.demV[1] * pxPerPu);
        this.arrowGenV.setEnd(this.genV[0] * pxPerPu, this.genV[1] * pxPerPu);
        this.container.addChild(this.arrowDemI.container);
        this.container.addChild(this.arrowDemV.container);
        this.container.addChild(this.arrowGenV.container);
    }

    gameLoop(delta) {
        // 現在の発電機電圧を取得
        this.genV = [
            (this.arrowGenV.x2 - this.arrowGenV.x1) * puPerPx,
            (this.arrowGenV.y2 - this.arrowGenV.y1) * puPerPx
        ];
        // 潮流計算
        [this.genI, this.ssV, this.demI] = flowPQUnknown(this.genV, this.ssI, this.demV);
        // 矢印に反映
        this.arrowDemI.setEnd(this.demI[0] * pxPerPu, this.demI[1] * pxPerPu);
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
    currentStage = stage;
    app.stage.addChild(stage.container);

    app.ticker.add((delta) => gameLoop(delta))
}

function gameLoop(delta) {
    currentStage.gameLoop(delta);
}