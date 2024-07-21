import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { settingsTemplate } from "./settings"
import ja from "./translations/ja.json"
const keyNameToolbarPopup = "toolbar-box-itft"//ポップアップのキー名
const keyRefreshButton = "tbft--refresh"//リフレッシュボタンのキー名
const pluginName = "Template-Block from Toolbar"//プラグイン名
const keyToolbar = "insertTemplateToolbar"
const icon = "🛢️"


/* main */
const main = async () => {

  //多言語化 L10N
  await l10nSetup({ builtinTranslations: { ja } })
  // 設定の読み込み ※設定項目なし
  logseq.useSettingsSchema(settingsTemplate())

  //CSS
  logseq.provideStyle(`
  body>div#template-block-from-toolbar--toolbar-box-itft {
    & button {
      opacity: 0.7;
      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
      &.tbft--openButton {
        margin-left: 0.7em;
      }
    }
    & hr {
      margin-top: 1em;
      margin-bottom: 1em;
    }
  }
  `)


  //ツールバーにポップアップ画面を開くボタンを追加
  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `<div><a class="button icon" id="${keyToolbar}" data-on-click="${keyToolbar}" style="font-size: 18px">${icon}</a></div>`,
  })


  //クリックイベント
  logseq.provideModel({

    //ツールバーのボタンをクリックしたら、ポップアップを表示
    [keyToolbar]: () => openPopupFromToolbar(),

    //リフレッシュボタンを押したらポップアップの本文をリフレッシュ
    [keyRefreshButton]: () => displayTemplateList(),

  })


  logseq.beforeunload(async () => {
    //ポップアップを削除
    parent.document.getElementById(logseq.baseInfo.id + "--" + keyNameToolbarPopup)?.remove()
  })/* end_beforeunload */


}/* end_main */



const openPopupFromToolbar = () => {

  //ポップアップを表示
  logseq.provideUI({
    attrs: {
      title: `${icon}${pluginName} ${t("Plugin")}`,
    },
    key: keyNameToolbarPopup,
    reset: true,
    style: {
      width: "370px",
      height: "600px",
      overflowY: "auto",
      left: "unset",
      bottom: "unset",
      right: "1em",
      top: "4em",
      paddingLeft: "2em",
      paddingTop: "2em",
      backgroundColor: 'var(--ls-primary-background-color)',
      color: 'var(--ls-primary-text-color)',
      boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
    },
    template: `
        <div title="">
        <p>${t("Select a block first, then click the template name to insert that template.")}</p>
        <hr/>
        <div id="itft-popup-main"></div>
        </div>
        `,
  })
  setTimeout(async () =>
    await displayTemplateList()//#itft-popup-mainにテンプレート一覧を表示
    , 50)
}



//処理中フラグ
let processing = false

//ポップアップの本文を作成・リフレッシュ
const displayTemplateList = async () => {
  if (processing) return
  processing = true
  setTimeout(() => processing = false, 1000)

  // ポップアップの本文を取得
  const popupMain = parent.document.getElementById("itft-popup-main")
  if (popupMain) {
    popupMain.innerHTML = ""//リフレッシュ

    const templateListArray = await logseq.App.getCurrentGraphTemplates() as Record<string, BlockEntity> | null

    // console.log(templateListArray);

    if (templateListArray) {
      // tableを作成
      const tableElement = document.createElement("table")
      tableElement.className = "tbft--templateTable"
      tableElement.style.marginLeft = "auto"
      tableElement.style.marginRight = "auto"

      const templateListArrayKeys = Object.keys(templateListArray)

      // キーでソート
      templateListArrayKeys.sort((a, b) => a.localeCompare(b))

      templateListArrayKeys.forEach((templateName) => {
        // 行を作成
        const rowElement = document.createElement("tr")
        rowElement.className = "tbft--templateRow"

        // テンプレート名のセルを作成
        const nameCell = document.createElement("th")
        const button = document.createElement("button")
        button.textContent = templateName
        button.addEventListener("click", handleTemplateButtonClick(templateName))
        nameCell.appendChild(button)
        rowElement.appendChild(nameCell)

        // テンプレートブロックを開くボタンのセルを作成
        const openButtonCell = document.createElement("td")
        const openButton = document.createElement("button")
        openButton.textContent = "📖"
        openButton.title = t("Open this template-block")
        openButton.className = "tbft--openButton"
        openButton.addEventListener("click", ({ shiftKey }) => {
          const blockEntity = templateListArray[templateName] as { uuid: BlockEntity["uuid"] }
          if (shiftKey === true)
            logseq.Editor.openInRightSidebar(blockEntity.uuid)
          else
            logseq.App.pushState('page', { name: blockEntity.uuid })
        })
        openButtonCell.appendChild(openButton)
        rowElement.appendChild(openButtonCell)

        tableElement.appendChild(rowElement)
      })

      // 元に戻す・やり直しボタンを反映
      popupMain.appendChild(createRedoUndoButtons())

      // テンプレート一覧を反映
      popupMain.appendChild(tableElement)

    }
    else
      popupMain.appendChild(document.createElement("p")).textContent = t("No templates found.")

    //hr
    popupMain.appendChild(document.createElement("hr"))

    // タイムスタンプを反映
    popupMain.appendChild(createTimestampAndUpdateButton())
  }
}


const createRedoUndoButtons = () => {
  const redoUndoButtons = document.createElement("div")
  redoUndoButtons.className = "flex justify-between"

  //元に戻すボタン
  const undoButton = document.createElement("button")
  undoButton.className = "button text-lg"
  undoButton.textContent = "↩️"
  undoButton.title = t("Undo")
  undoButton.addEventListener("click", (ev) => {
    logseq.App.invokeExternalCommand("logseq.editor/undo" as any)
    ev.stopPropagation()
  })
  redoUndoButtons.appendChild(undoButton)

  //やり直しボタン
  const redoButton = document.createElement("button")
  redoButton.className = "button text-lg"
  redoButton.textContent = "↪️"
  redoButton.title = t("Redo")
  redoButton.addEventListener("click", (ev) => {
    logseq.App.invokeExternalCommand("logseq.editor/redo" as any)
    ev.stopPropagation()
  })
  redoUndoButtons.appendChild(redoButton)
  return redoUndoButtons
}


const createTimestampAndUpdateButton = () => {
  const timestamp = document.createElement("p")
  timestamp.textContent = new Date().toLocaleString()
  timestamp.className = "flex justify-between text-sm"
  // リフレッシュボタン
  const refreshButton = document.createElement("button")
  refreshButton.className = "button"
  refreshButton.textContent = "🔄"
  refreshButton.title = t("Refresh")
  refreshButton.dataset.onClick = keyRefreshButton
  timestamp.appendChild(refreshButton)
  return timestamp
}


function handleTemplateButtonClick(templateName: string): (this: HTMLButtonElement, ev: MouseEvent) => any {
  return async () => {
    // ブロックへテンプレート挿入処理
    //現在のブロックを取得
    const currentBlock = await logseq.Editor.getCurrentBlock() as { uuid: BlockEntity["uuid"]; content: BlockEntity["content"]}  | null
    if (currentBlock) {
      //current.contentが空ではない場合はキャンセル
      if (currentBlock.content !== "") {
        logseq.UI.showMsg(t("The current block is not empty."), "warning")
        return
      }
      //テンプレートを取得
      if (await logseq.App.existTemplate(templateName)) { // テンプレートが存在する場合
        if (await logseq.App.insertTemplate(currentBlock.uuid, templateName)) { // ブロックにテンプレートを挿入
          logseq.UI.showMsg(t("Failed to insert the template."), "warning")
          console.warn("Failed to insert the template.", templateName, currentBlock)
        }
        else
          logseq.UI.showMsg(t("Inserted the template."), "success")
      }

    } else {
      //ブロックが選択されていない場合
      logseq.UI.showMsg(t("No block selected."), "warning")
    }
  }
}


logseq.ready(main).catch(console.error)