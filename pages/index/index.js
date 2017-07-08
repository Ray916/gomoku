//index.js
//获取应用实例
var app = getApp()

const context = wx.createCanvasContext('myCanvas');
var chessboardSize = 15;
var chessState = [];
var gameover = false;
var round = 0;
var chessCount = 0;
var gameResult = "";
var operationLog = [];
var relativeEmptyPosition = [];
var chess = ["", "black", "white"];
var role = { 'human': 1, 'AI': 2 };
var turn = role.human;
var locale = {
  restart: '重新开始',
  regret: '悔棋',
  youLose: '你输了！',
  youWin: '你赢了！',
  whiteChess: '白棋',
  blackChess: '黑棋'
};

Page({
  data: {
    userInfo: {},
    total:0, 
    win: 0
  },
  canvasIdErrorCallback: function (e) {
    console.error(e.detail.errMsg);
  },
  onLoad: function () {
    var that = this
    //调用应用实例的方法获取全局数据
    app.getUserInfo(function(userInfo){
      //更新数据
      that.setData({
        userInfo:userInfo
      })
    });
    var game_info = wx.getStorageSync('gomoku_betago');
    if (game_info) {
     // console.log(game_info);
      var infoList = game_info.split("_");
      that.setData({
        win: parseInt(infoList[0]),
        total: parseInt(infoList[1])
      });
    }
    that.createChessBoard();
    that.initVariables();
    that.autoPutChess();
  },
  //画棋盘
  createChessBoard: function () {
    //console.log("画棋盘");
    for (var i = 0; i < chessboardSize; i++) {
      context.setFillStyle("black");
      context.moveTo(10 + i * 20, 10);
      context.lineTo(10 + i * 20, 290);
      context.stroke();
      context.moveTo(10, 10 + i * 20);
      context.lineTo(290, 10 + i * 20);
      context.stroke();
    }
    context.setFillStyle("red");
    context.fillRect(8 + 3 * 20, 8 + 3 * 20, 4, 4);
    context.fillRect(8 + 3 * 20, 8 + 11 * 20, 4, 4);
    context.fillRect(8 + 7 * 20, 8 + 7 * 20, 4, 4);
    context.fillRect(8 + 11 * 20, 8 + 3 * 20, 4, 4);
    context.fillRect(8 + 11 * 20, 8 + 11 * 20, 4, 4);
    context.fill();
    context.draw();
  },
  //画棋子
  createChess: function (i, j, who) {
    //console.log("画棋子");
    context.beginPath();
    context.arc(10 + j * 20, 10 + i * 20, 8, 0, 2 * Math.PI);
    var g = context.createCircularGradient(10 + j * 20, 10 + i * 20, 8);
    if (who == role.human) {
      g.addColorStop(0, '#636766');
      g.addColorStop(1, '#0A0A0A');//黑棋 
    } else {
      g.addColorStop(0, '#F9F9F9');
      g.addColorStop(1, '#D1D1D1');//白棋

    }
    context.setFillStyle(g);
    context.fill();
    context.draw(true);
  },
  //canvas点击事件
  onClickChessboard: function (e) {
    var that = this;
    if (turn === role.human) {
      var i = Math.round((e.touches[0].y - 10) / 20);
      var j = Math.round((e.touches[0].x - 10) / 20);
      console.log(i, j);
      that.putChess(i, j, role.human);
    }
  },
  //初始化参数
  initVariables: function () {
    var i, j, row;
    operationLog = [];
    chessState = [];
    for (i = 0; i < chessboardSize; i++) {
      row = [];
      for (j = 0; j < chessboardSize; j++) {
        row.push(0);
      }
      chessState.push(row);
    }
    gameover = false;
    role = { 'human': 1, 'AI': 2 };
    turn = role.human;
    round = 0;
    chessCount = 0;
    gameResult = "";
    //console.log("参数初始化完成");
  },
  //放棋子
  putChess: function (i, j, who) {
    if (chessState[i][j] === role.AI || chessState[i][j] === role.human || gameover) {
      return
    }
    var that = this;
    if (who === role.human || who === role.AI) {
      that.createChess(i, j, who);
      chessState[i][j] = who;
      chessCount++;
      if (chessCount % 2 === 0) {
        round++;
      }
      operationLog.push({ i: i, j: j });
      that._checkGameover();
      if (gameover) {
        that.displayGameover();
      }
      if (turn === role.human) {
        turn = role.AI;
        that.autoPutChess();
      } else {
        turn = role.human;
      }
    }
  },
  //AI下棋
  autoPutChess: function () {
    var that = this;
    if (turn === role.AI && !gameover) {
      result = that._findArea();
      console.log("result:" + result.i, result.j);
      that.putChess(result.i, result.j, role.AI);
    }
  },
  //页面展示游戏结束
  displayGameover: function () {
    wx.showToast({
      title: gameResult,
      icon: 'success',
      duration: 2000
    });
    //this.createChessBoard();
    //this.initVariables();
    //console.log("turn:" + turn + "。游戏结束！");
  },
  //重新开始
  restart: function(){
    var that = this;
    that.createChessBoard();
    that.initVariables();
    that.autoPutChess();
  },
  _findArea: function () {
    var returnObjArray = [],
      returnObj = null,
      i = 0,
      j = 0,
      chessState_tmp = chessState,
      res = null,
      priority = 0,
      maxPriority = 0;
    for (i = 0; this._valid(i); i++) {
      for (j = 0; this._valid(j); j++) {
        if (chessState_tmp[i][j] === 0) {
          this._setChessState(i, j, role.AI);
          res = this._getState(i, j, role.AI);
          this._setChessState(i, j, 0);
          priority = this._getPriority(res, role.AI);
          returnObjArray.push({
            i: i,
            j: j,
            priority: priority
          });
          this._setChessState(i, j, role.human);
          res = this._getState(i, j, role.human);
          this._setChessState(i, j, 0);
          priority = this._getPriority(res, role.human);
          returnObjArray.push({
            i: i,
            j: j,
            priority: priority
          })
        }
      }
    }
    maxPriority = returnObjArray[0].priority;
    for (var k = 1; k < returnObjArray.length; k++) {
      if (maxPriority < returnObjArray[k].priority) {
        maxPriority = returnObjArray[k].priority;
      }
    }
    if (maxPriority === -100 && chessState[7][7] === 0) {
      returnObj = this._getCenterPosition();
    } else {
      for (var k = 0; k < returnObjArray.length; k++) {
        if (returnObjArray[k].priority === maxPriority) {
          returnObj = {
            i: returnObjArray[k].i,
            j: returnObjArray[k].j
          };
        }
      }
    }
    return returnObj;
  },
  _setChessState: function (i, j, val) {
    try {
      this.chessState[i][j] = parseInt(val)
    } catch (e) { }
  },
  _setOperationLog: function (i, j) {
    chessCount++;
    if (chessCount % 2 === 0) {
      round++
    }
    operationLog.push({
      i: parseInt(i),
      j: parseInt(j)
    })
  },
  _valid: function (i) {
    return i >= 0 && i < chessboardSize && typeof (i) === "number" && !isNaN(i);
  },
  _getState: function (i, j, role) {
    var horizontalState1 = this._getHorizontalState(i, j, role),
      diagonalState1 = this._getDiagonalState(i, j, role),
      res = this._rotateChessStateClockwise90(i, j),
      horizontalState2 = this._getHorizontalState(res.i, res.j, role),
      diagonalState2 = this._getDiagonalState(res.i, res.j, role);
    try {
      for (var k = 0; k < horizontalState2.available.length; k++) {
        var _i = horizontalState2.available[k].i;
        var _j = horizontalState2.available[k].j;
        horizontalState2.available[k].i = chessboardSize - 1 - _j;
        horizontalState2.available[k].j = _i
      }
    } catch (e) { }
    try {
      for (var k = 0; k < diagonalState2.available.length; k++) {
        var _i = diagonalState2.available[k].i;
        var _j = diagonalState2.available[k].j;
        diagonalState2.available[k].i = chessboardSize - 1 - _j;
        diagonalState2.available[k].j = _i
      }
    } catch (e) { }
    this._rotateChessStateAnticlockwise90();
    return [horizontalState1, horizontalState2, diagonalState1, diagonalState2]
  },
  _getHorizontalState: function (i, j, role) {
    if (!this._valid(i) || !this._valid(j)) {
      return {}
    }
    var m = 1,
      chessCount = 1,
      end = false,
      skip = 0,
      firstChess = {
        i: i,
        j: j
      },
      lastChess = {
        i: i,
        j: j
      },
      chessSpan = 0,
      aliveCount = 0,
      alive = true,
      aliveSidesCount = 0,
      available = [],
      chess = [];
    while (this._valid(j + m)) {
      if (end) {
        break
      }
      if (skip > 1) {
        break
      }
      switch (chessState[i][j + m]) {
        case 0:
          if (skip === 0 || chessState[i][j + m - 1] !== 0) {
            available.push({
              i: i,
              j: j + m
            })
          }
          skip++;
          break;
        case role:
          chessCount++;
          chess.push({
            i: i,
            j: j + m
          });
          lastChess = {
            i: i,
            j: j + m
          };
          break;
        default:
          end = true
      }
      m++
    }
    end = false;
    skip = 0;
    m = 1;
    while (this._valid(j - m)) {
      if (end) {
        break
      }
      if (skip > 1) {
        break
      }
      switch (chessState[i][j - m]) {
        case 0:
          if (skip === 0 || chessState[i][j - m + 1] !== 0) {
            available.push({
              i: i,
              j: j - m
            })
          }
          skip++;
          break;
        case role:
          firstChess = {
            i: i,
            j: j - m
          };
          chessCount++;
          chess.push({
            i: i,
            j: j - m
          });
          break;
        default:
          end = true
      }
      m++;
    }
    chessSpan = lastChess.j - firstChess.j + 1;
    var connetedChessCount = [1],
      tmpCount = 1,
      invalidCount = 0;
    m = 1;
    while (this._valid(firstChess.j + m)) {
      if (chessState[firstChess.i][firstChess.j + m] !== role) {
        invalidCount++;
        if (invalidCount > 1) {
          break
        }
        if (tmpCount < 10) {
          tmpCount = 0
        } else {
          break
        }
      } else {
        tmpCount++;
        connetedChessCount.push(tmpCount)
      }
      m++
    }
    for (m = 0; m < chessSpan; m++) {
      if ([0, role].indexOf(chessState[firstChess.i][firstChess.j + m]) >= 0) {
        aliveCount++
      }
    }
    try {
      if ([0, role].indexOf(chessState[firstChess.i][firstChess.j - 1]) >= 0) {
        aliveSidesCount++
      }
    } catch (e) { }
    try {
      if ([0, role].indexOf(chessState[firstChess.i][firstChess.j + 1]) >= 0) {
        aliveSidesCount++
      }
    } catch (e) { }
    if (aliveCount < 4) {
      alive = aliveSidesCount > 0
    }
    return {
      alive: alive,
      aliveSidesCount: aliveSidesCount,
      available: available,
      chess: chess,
      chessCount: chessCount,
      connetedChessCount: Math.min(Math.max.apply(null, connetedChessCount), chessCount)
    }
  },
  _getDiagonalState: function (i, j, role) {
    if (i >= chessboardSize || j >= chessboardSize) {
      return {}
    }
    var chessCount = 1,
      end = false,
      skip = 0,
      alive = true,
      aliveCount = 0,
      aliveSidesCount = 0,
      firstChess = {
        i: i,
        j: j
      }, lastChess = {
        i: i,
        j: j
      }, chessSpan = 0, m = 1, available = [], chess = [];
    while (this._valid(i + m) && this._valid(j + m)) {
      if (end) {
        break
      }
      if (skip > 1) {
        break
      }
      switch (chessState[i + m][j + m]) {
        case 0:
          if (skip === 0 || chessState[i + m - 1][j + m - 1] !== 0) {
            available.push({
              i: i + m,
              j: j + m
            })
          }
          skip++;
          break;
        case role:
          chessCount++;
          chess.push({
            i: i + m,
            j: j + m
          });
          lastChess = {
            i: i + m,
            j: j + m
          };
          break;
        default:
          end = true
      }
      m++
    }
    end = false;
    skip = 0;
    m = 1;
    while (this._valid(i - m) && this._valid(j - m)) {
      if (end) {
        break
      }
      if (skip > 1) {
        break
      }
      switch (chessState[i - m][j - m]) {
        case 0:
          if (skip === 0 || chessState[i - m + 1][j - m + 1] !== 0) {
            available.push({
              i: i - m,
              j: j - m
            })
          }
          skip++;
          break;
        case role:
          firstChess = {
            i: i - m,
            j: j - m
          };
          chessCount++;
          chess.push({
            i: i - m,
            j: j - m
          });
          break;
        default:
          end = true
      }
      m++
    }
    chessSpan = lastChess.i - firstChess.i + 1;
    var connetedChessCount = [1],
      tmpCount = 1,
      invalidCount = 0;
    m = 1;
    while (this._valid(firstChess.i + m) && this._valid(firstChess.j + m)) {
      if (chessState[firstChess.i + m][firstChess.j + m] !== role) {
        invalidCount++;
        if (invalidCount > 1) {
          break
        }
        if (tmpCount < 10) {
          tmpCount = 0
        } else {
          break
        }
      } else {
        tmpCount++;
        connetedChessCount.push(tmpCount)
      }
      m++
    }
    for (m = 0; m < chessSpan; m++) {
      if ([0, role].indexOf(chessState[firstChess.i + m][firstChess.j + m]) >= 0) {
        aliveCount++
      }
    }
    try {
      if ([0, role].indexOf(chessState[firstChess.i - 1][firstChess.j - 1]) >= 0) {
        aliveSidesCount++
      }
    } catch (e) { }
    try {
      if ([0, role].indexOf(chessState[firstChess.i + 1][firstChess.j + 1]) >= 0) {
        aliveSidesCount++
      }
    } catch (e) { }
    if (aliveCount < 4) {
      alive = aliveSidesCount > 0
    }
    return {
      alive: alive,
      aliveSidesCount: aliveSidesCount,
      available: available,
      chess: chess,
      chessCount: chessCount,
      connetedChessCount: Math.min(Math.max.apply(null, connetedChessCount), chessCount)
    }
  },
  _getPriority: function (stateObject, role) {
    var priority, chess2 = [null, {
      count: 0,
      aliveSidesCount: 0
    }, {
        count: 0,
        aliveSidesCount: 0
      }, {
        count: 0,
        aliveSidesCount: 0
      }, {
        count: 0,
        aliveSidesCount: 0
      }, {
        count: 0,
        aliveSidesCount: 0
      }];
    Array.from(stateObject).forEach((v, k) => {
      if (v.connetedChessCount >= 5) {
        chess2[5].count++
      } else {
        if (v.connetedChessCount === 4 && v.alive) {
          chess2[4].count++;
          chess2[4].aliveSidesCount = v.aliveSidesCount
        } else {
          if (v.available.length > 1 && v.alive) {
            chess2[v.connetedChessCount].count++;
            chess2[v.connetedChessCount].aliveSidesCount = v.aliveSidesCount
          }
        }
      }
    });
    if (chess2[5].count > 0) {
      priority = role === role.AI ? 4 : 3
    } else {
      if (chess2[4].count > 0 && chess2[4].aliveSidesCount > 1) {
        priority = role === role.AI ? 2 : 1
      } else {
        if (chess2[3].count >= 2) {
          priority = role === role.AI ? 0 : -1
        } else {
          if (chess2[4].count > 0 && chess2[4].aliveSidesCount === 1) {
            priority = role === role.AI ? -2 : -3
          } else {
            if (chess2[3].count === 1) {
              priority = role === role.AI ? -4 : -5
            } else {
              if (chess2[2].count > 0) {
                priority = role === role.AI ? -6 : -7
              } else {
                priority = -100
              }
            }
          }
        }
      }
    }
    return priority;
  },
  _reverseChessState: function (i, j) {
    var newArr = [],
      i = 0,
      j = 0,
      row = [];
    for (i = chessboardSize - 1; i >= 0; i--) {
      row = [];
      for (j = chessboardSize - 1; j >= 0; j--) {
        row.push(chessState[i][j])
      }
      newArr.push(row)
    }
    chessState = newArr;
    newArr = null;
    if (typeof (i) != "undefined" && typeof (j) != "undefined") {
      return {
        i: chessboardSize - 1 - i,
        j: chessboardSize - 1 - j
      }
    }
    return null
  },
  _rotateChessStateClockwise90: function (i, j) {
    var newArr = [],
      row = [],
      returnObj = null;
    if (typeof (i) != "undefined" && typeof (j) != "undefined") {
      returnObj = {
        i: j,
        j: chessboardSize - 1 - i
      }
    }
    for (i = chessboardSize - 1; i >= 0; i--) {
      row = [];
      for (j = chessboardSize - 1; j >= 0; j--) {
        row.push(chessState[j][chessboardSize - 1 - i])
      }
      newArr.push(row)
    }
    chessState = newArr;
    //  console.table("chessState after rotateChessStateClockwise90:" + chessState);
    newArr = null;
    return returnObj
  },
  _rotateChessStateAnticlockwise90: function (i, j) {
    var newArr = [],
      i = 0,
      j = 0,
      row = [];
    for (i = chessboardSize - 1; i >= 0; i--) {
      row = [];
      for (j = chessboardSize - 1; j >= 0; j--) {
        row.push(chessState[chessboardSize - 1 - j][i])
      }
      newArr.push(row)
    }
    chessState = newArr;
    //console.table("chessState after rotateChessStateAntilockwise90:" + chessState);
    newArr = null;
    if (typeof (i) != "undefined" && typeof (j) != "undefined") {
      return {
        i: chessboardSize - 1 - j,
        j: i
      }
    }
    return null;
  },
  _checkGameover: function () {
    var last = operationLog[operationLog.length - 1];
    var i = parseInt(last.i),
      j = parseInt(last.j);
    var res = this._getState(i, j, turn);
    Array.from(res).forEach((v, k) => {
      if (v.connetedChessCount >= 5) {
        gameover = true;
        return false;
      }
    });
    if (gameover) {
     // gameResult = turn == role.human ? locale.youWin : locale.youLose;
      if(turn == role.human){
        gameResult = locale.youWin;
        this.setData({
          win: this.data.win + 1,
          total: this.data.total + 1
        });
      }else{
        gameResult = locale.youLose;
        this.setData({
          total: this.data.total + 1
        });
      }
      try {
        var game_info = "" + this.data.win + "_" + this.data.total;
        wx.setStorageSync('gomoku_betago', game_info);
      } catch (e) {
      }
      return;
    }
  },
  _getCenterPosition: function () {
    var center = Math.floor(chessboardSize / 2);
    return {
      i: center,
      j: center
    }
  },
  onShareAppMessage: function () {
    return {
      path: '/page/index.wxml',
      success: function (res) {
        wx.showToast({
          title: "分享成功！",
          icon: 'success',
          duration: 2000
        });
      }
    }
  }
})
