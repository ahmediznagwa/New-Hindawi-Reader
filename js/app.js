const prodRootUrl = "https://ahmediznagwa.github.io/New-Hindawi-Reader";
const devRootUrl = "..";
const nagwaReaders = (function () {
  class UTILS {
    /**
     * An object containing all the DOM elements required for the app to run
     * @static
     * @memberof UTILS
     */
    static DOM_ELS = {
      get nextPageBtn() {
        return document.querySelector(".pagination-next-page");
      },
      get prevPageBtn() {
        return document.querySelector(".pagination-prev-page");
      },
      get nextChapterBtn() {
        return document.querySelector(".pagination-next-chapter");
      },
      get prevChapterBtn() {
        return document.querySelector(".pagination-prev-chapter");
      },
      get biggerFontBtn() {
        return document.getElementById("pagination-font-bigger");
      },
      get smallerFontBtn() {
        return document.getElementById("pagination-font-smaller");
      },
      get resetFontBtn() {
        return document.getElementById("pagination-font-reset");
      },
      get percent() {
        return document.querySelector(".pagination-percent");
      },
      get currentPageOfAllPages() {
        return document.querySelector(".pagination-current-page");
      },
      get allPages() {
        return document.querySelector(".pagination-pages");
      },
      get darkModeChk() {
        return document.querySelector(".change-color-mode input");
      },
      get colorModeBtns() {
        return document.querySelectorAll(".change-color");
      },
      get book() {
        return document.querySelector(".book:not(.demo)");
      },
      get demoBook() {
        return document.querySelector(".book.demo");
      },
      get bookChapter() {
        return document.querySelector(".book-chapter");
      },
      get bookContainer() {
        return document.querySelector(".book-container");
      },
      get bookWrapper() {
        return document.querySelector(".book-wrapper");
      },
      get words() {
        return document.querySelectorAll("p");
      },
      get highlight() {
        return document.querySelectorAll(".highlight");
      },
      get unhighlight() {
        return document.querySelectorAll(".unhighlight");
      },
      get copy() {
        return document.querySelectorAll(".copy");
      },
    };

    static extractComputedStyleNumber(el, style) {
      const str = getComputedStyle(el)[style];
      return +str.substring(0, str.length - 2);
    }

    static calcPageCount() {
      const columnsGap =
        this.extractComputedStyleNumber(this.DOM_ELS.book, "column-gap") || 0;

      return Math.round(
        (this.DOM_ELS.book.scrollWidth + columnsGap) /
          (this.DOM_ELS.book.offsetWidth + columnsGap)
      );
    }
  }

  class HTMLExtractor {
    constructor(bookId) {
      this.bookId = bookId;
      this.chapters = [];
      this.bookNav = [];
    }

    async setNav() {
      const res = await fetch(
        `${prodRootUrl}/packages/${this.bookId}/Navigation/nav.xhtml`
      );
      const htmlTxt = await res.text();
      const parser = new DOMParser();
      const html = parser.parseFromString(htmlTxt, "text/html");
      const navList = html.querySelector("ol").querySelectorAll("a");
      navList.forEach((item) => {
        const chapterNameParts = item.getAttribute("href").split("/");
        this.bookNav.push(chapterNameParts[chapterNameParts.length - 1]);
      });
    }

    async extractChapters() {
      await this.setNav();
      this.bookNav.forEach(async (name) => {
        this.chapters.push(this.getHTMLDoc(name));
      });
      this.chapters = await Promise.all([...this.chapters]);
      this.chapters = this.chapters.map((res) => {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(res, "text/html");
        const bodyEl = htmlDoc.querySelector("body");
        const chapter = bodyEl.firstElementChild;
        return chapter;
      });
    }

    async getHTMLDoc(name) {
      const res = await fetch(
        `${prodRootUrl}/packages/${this.bookId}/Content/${name}`
      );
      return await res.text();
    }
  }

  class BookChapter {
    constructor(chapterEl, bookId) {
      this.bookId = bookId;
      this.chapterEl = chapterEl;
      this.page = 0;
      this.storyContainerPadding = 0;
      this.exactColumnsGap = 0;
      this.exactColumnWidth = 0;
      this.columnWidth = 0;
      this.renderChapter();
    }
    renderChapter() {
      const section = document.createElement("section");
      section.classList.add("book-chapter");
      section.innerHTML = this.chapterEl?.innerHTML;
      UTILS.DOM_ELS.book.innerHTML = "";
      UTILS.DOM_ELS.book.append(section);
      this.updateImagesPaths();
      this.bindClickEventOnAllWordsInChapter();
    }

    updateImagesPaths() {
      const images = UTILS.DOM_ELS.book.querySelectorAll("img");
      images.forEach((img) => {
        const currentSrc = img.attributes.src.value;
        img.src = currentSrc.replace(
          "../Images/",
          `${prodRootUrl}/packages/${this.bookId}/Images/`
        );
      });
    }

    highlightWord(target) {
      $(target).closest(".actions-menu").addClass("has-highlight");
      $(target).addClass("highlighted");
      $(".actions-menu").remove();
      this.saveHighlightedWords();
    }
    unhighlightWord(target) {
      $(target).closest(".actions-menu").removeClass("has-highlight");
      $(target).removeClass("highlighted");
      $(".actions-menu").remove();
    }

    saveHighlightedWords() {
      const highlightedWords = Array.from(
        document.querySelectorAll(".highlighted")
      );
      console.log(highlightedWords);
      localStorage.setItem(
        "highlightedWords",
        JSON.stringify({
          chapter: this.currentChapterIndex,
          words: highlightedWords,
        })
      );
    }
    copyText(target) {
      navigator.clipboard.writeText(target.textContent);
      $(".actions-menu").remove();
    }

    bindClickEventOnAllWordsInChapter() {
      UTILS.DOM_ELS.words?.forEach((word) => {
        word.addEventListener("click", this.wordEventHandler.bind(this));
      });
    }

    wordEventHandler(e) {
      e.stopPropagation();
      $(".actions-menu").remove();
      const top = $(e.target).offset().top;
      const menu = document.createElement("div");
      menu.classList.add("actions-menu");
      const actionsMenu = `
        <ul>
          <li class="highlight"><a href="#">تلوين</a></li>
          <li class="unhighlight"><a href="#">الغاء التلوين</a></li>
          <li class="copy"><a href="#">نسخ</a></li>
        </ul>
      `;

      if ($(e.target).hasClass("highlighted")) {
        $(menu).addClass("has-highlight");
      }
      menu.innerHTML = actionsMenu;
      document.body.appendChild(menu);

      // Positioning the appended menu according to word
      $(menu).css({
        position: "absolute",
        left: window.innerWidth / 2,
        transform: "translate(-50%,-120%)",
        top,
      });

      // Binding click events on menu
      $(menu).on("click", function (e) {
        e.stopPropagation();
      });
      menu
        .querySelector(".highlight")
        .addEventListener("click", this.highlightWord.bind(this, e.target));
      menu
        .querySelector(".unhighlight")
        .addEventListener("click", this.unhighlightWord.bind(this, e.target));
      menu
        .querySelector(".copy")
        .addEventListener("click", this.copyText.bind(this, e.target));
    }
  }

  class UserPreferences {
    constructor(bookId) {
      this.bookId = bookId;
      this.page = 0;
      this.chapter = 0;
      this.fontSize = 0;
      this.isDarkMode = false;
      this.colorMode = "white";

      this.localStorageKeys = {
        fontSize: `${this.bookId}_fontSize`,
        isDarkMode: "isDarkMode",
        colorMode: "colorMode",
        lastPosition: `${this.bookId}_lastPosition`, //its value in Localstorage will be a JSON containing chapter and page,
        page: "page",
        chapter: "chapter",
      };
    }

    save(
      currentPage,
      currentChapter,
      fontSize,
      isDarkMode,
      colorMode,
      saveToLocalStorage = true
    ) {
      this.page = currentPage;
      this.chapter = currentChapter;
      this.fontSize = fontSize;
      this.isDarkMode = isDarkMode;
      this.colorMode = colorMode;
      if (saveToLocalStorage) {
        localStorage.setItem(
          this.localStorageKeys.lastPosition,
          JSON.stringify({
            [this.localStorageKeys.chapter]: this.chapter,
            [this.localStorageKeys.page]: this.page,
          })
        );
        localStorage.setItem(this.localStorageKeys.fontSize, this.fontSize);
        localStorage.setItem(this.localStorageKeys.isDarkMode, this.isDarkMode);
        localStorage.setItem(this.localStorageKeys.colorMode, this.colorMode);
      }
    }

    load() {
      this.fontSize = +localStorage.getItem(this.localStorageKeys.fontSize);
      this.isDarkMode = JSON.parse(
        localStorage.getItem(this.localStorageKeys.isDarkMode)
      );
      this.colorMode = localStorage.getItem(this.localStorageKeys.colorMode)
        ? localStorage.getItem(this.localStorageKeys.colorMode)
        : "white";
      const lastPosition = JSON.parse(
        localStorage.getItem(this.localStorageKeys.lastPosition)
      );
      this.chapter = lastPosition?.chapter;
      this.page = lastPosition?.page;
      return {
        fontSize: this.fontSize,
        isDarkMode: this.isDarkMode,
        colorMode: this.colorMode,
        chapter: this.chapter,
        page: this.page,
      };
    }
  }
  class Controller {
    constructor() {}

    async initWithBookId(bookId) {
      this.htmlExtractor = new HTMLExtractor(bookId);
      await this.htmlExtractor.extractChapters();
      this.detectUserPreferences(bookId);
      this.setupHandlers();
      this.setupEventListeners();
    }

    setupHandlers() {
      this.book = new Book(
        this.htmlExtractor.bookId,
        this.htmlExtractor.chapters,
        this?.userPreferences?.fontSize,
        this?.userPreferences?.chapter,
        this?.userPreferences?.page,
        this?.userPreferences?.isDarkMode,
        this?.userPreferences?.colorMode
      );
    }

    detectUserPreferences(bookId) {
      this.userPreferences = new UserPreferences(bookId);
      this.userPreferences.load();
    }

    /**
     * Stores the current state of the app
     * @memberof Controller
     */
    storeUserPreferences() {
      this?.userPreferences?.save(
        this.book.currentPage,
        this.book.currentChapterIndex,
        this.book.fontSize,
        this.book.isDarkMode,
        this.book.colorMode
      );
    }

    setupEventListeners() {
      window?.addEventListener("resize", () =>
        setTimeout(this.resizeEventHandler.bind(this), 0)
      );
      $(window).on("orientationchange", () =>
        setTimeout(this.resizeEventHandler.bind(this), 0)
      ); //The only jQuery line
      document.onfullscreenchange = () =>
        setTimeout(this.resizeEventHandler.bind(this), 0);
      //DOM Elements event listeners
      UTILS.DOM_ELS.nextPageBtn?.addEventListener(
        "click",
        this.goToNextPage.bind(this)
      );
      UTILS.DOM_ELS.prevPageBtn?.addEventListener(
        "click",
        this.goToPrevPage.bind(this)
      );
      UTILS.DOM_ELS.nextChapterBtn?.addEventListener(
        "click",
        this.goToNextChapter.bind(this)
      );
      UTILS.DOM_ELS.prevChapterBtn?.addEventListener(
        "click",
        this.goToPrevChapter.bind(this)
      );
      UTILS.DOM_ELS.biggerFontBtn?.addEventListener(
        "click",
        this.increaseFontSize.bind(this)
      );
      UTILS.DOM_ELS.smallerFontBtn?.addEventListener(
        "click",
        this.decreaseFontSize.bind(this)
      );
      UTILS.DOM_ELS.resetFontBtn?.addEventListener(
        "click",
        this.resetFontSize.bind(this)
      );
      UTILS.DOM_ELS.darkModeChk?.addEventListener(
        "input",
        this.darkModeCheckInputEventHandler.bind(this)
      );
      UTILS.DOM_ELS.colorModeBtns?.forEach((btn) => {
        btn.addEventListener("click", this.colorModeEventHandler.bind(this));
      });
    }

    resizeEventHandler = () => {
      this.changePageToCurrentPercentage();
      this.storeUserPreferences();
    };
    changePageToCurrentPercentage() {
      this.book.changePage();
    }

    postNavigationHandler() {
      this.storeUserPreferences();
    }

    postFontResizeHandler() {
      UTILS.DOM_ELS.allPages.textContent = "...";
      UTILS.DOM_ELS.currentPageOfAllPages.textContent = "...";
      setTimeout(() => {
        this.changePageToCurrentPercentage();
        this.storeUserPreferences();
      }, 1000);
    }

    goToNextPage() {
      this.book.changePage("next");
      this.postNavigationHandler();
    }

    goToPrevPage() {
      this.book.changePage("prev");
      this.postNavigationHandler();
    }

    goToFirstPage() {
      this.book.changePage("first");
      this.postNavigationHandler();
    }

    goToLastPage() {
      this.book.changePage("last");
      this.postNavigationHandler();
    }

    goToNextChapter() {
      this.book.changeChapter("next");
      this.postNavigationHandler();
    }

    goToPrevChapter() {
      this.book.changeChapter("prev");
      this.postNavigationHandler();
    }

    goToFirstChapter() {
      this.book.changeChapter("first");
      this.postNavigationHandler();
    }

    goToLastChapter() {
      this.book.changeChapter("last");
      this.postNavigationHandler();
    }

    increaseFontSize() {
      this.book.changeFontSize("bigger");
      this.postFontResizeHandler();
    }

    decreaseFontSize() {
      this.book.changeFontSize("smaller");
      this.postFontResizeHandler();
    }

    resetFontSize() {
      this.book.changeFontSize("reset");
      this.postFontResizeHandler();
    }
    setDarkMode(isDarkMode) {
      this.book.changeDarkMode(isDarkMode);
      this.storeUserPreferences();
    }
    setColorMode(colorMode) {
      this.book.changeColorMode(colorMode);
      this.storeUserPreferences();
    }

    darkModeCheckInputEventHandler() {
      this.setDarkMode(/* Don't pass anything so it can fallback to the checkbox value */);
    }
    colorModeEventHandler(e) {
      UTILS.DOM_ELS.colorModeBtns?.forEach((btn) => {
        btn.classList.remove("selected");
      });
      e.target.classList.add("selected");
      this.setColorMode(e.target.dataset.value);
    }
  }

  class Book {
    constructor(
      bookId,
      chapters,
      fontSize = 18,
      currentChapterIndex = 0,
      currentPage = 0,
      isDarkMode = null,
      colorMode = "white"
    ) {
      this.bookId = bookId;
      this.chapters = chapters;
      this.currentChapterIndex = Math.min(
        currentChapterIndex || 0,
        this.chapters.length - 1
      );
      this.currentChapter = new BookChapter(
        this.chapters[this.currentChapterIndex],
        this.bookId
      );
      this.currentPage = Math.min(currentPage || 0, UTILS.calcPageCount() - 1);
      this.currentProgressPercent = 0;
      this.rootFontSize = 18;
      this.isDarkMode = isDarkMode;
      this.colorMode = colorMode;
      this.fontSizeStep = 0.15;
      this.fontSize = fontSize || this.rootFontSize;
      this.allBookTitles = [];
      this.changeFontSize();
      this.changePage();
      this.changeDarkMode(this.isDarkMode);
      this.changeColorMode(this.colorMode);
      this.addWholeBook();
    }
    updateChapterPageState() {
      this.isLastPage = this.currentPage >= UTILS.calcPageCount() - 1;
      this.isFirstPage = this.currentPage === 0;
      this.isLastChapter = this.currentChapterIndex >= this.chapters.length - 1;
      this.isFirstChapter = this.currentChapterIndex === 0;
    }
    updateFontIncreaseDecreaseState() {
      this.canIncreaseFont =
        this.fontSize <=
        this.rootFontSize + this.rootFontSize * this.fontSizeStep;
      this.canDecreaseFont =
        this.fontSize >=
        this.rootFontSize - this.rootFontSize * this.fontSizeStep;

      UTILS.DOM_ELS.resetFontBtn.textContent =
        Math.round((this.fontSize / this.rootFontSize) * 100) + "%";
      if (!this.canIncreaseFont) {
        UTILS.DOM_ELS.biggerFontBtn.classList.add("disabled");
        return;
      }
      if (!this.canDecreaseFont) {
        UTILS.DOM_ELS.smallerFontBtn.classList.add("disabled");
        return;
      }
      UTILS.DOM_ELS.smallerFontBtn.classList.remove("disabled");
      UTILS.DOM_ELS.biggerFontBtn.classList.remove("disabled");
    }

    addWholeBook() {
      const section = document.createElement("section");
      section.classList = "book demo";
      section.innerHTML = "";
      this.chapters.forEach((chapter) => {
        section.innerHTML = section.innerHTML += chapter?.innerHTML;
      });
      UTILS.DOM_ELS.bookWrapper.append(section);
      this.allBookTitles = UTILS.DOM_ELS.demoBook?.querySelectorAll("h1");
      setTimeout(() => {
        this.scrollToCurrentPage();
      }, 2000);
    }

    scrollToCurrentPage() {
      "scrolled";
      const columnWidth = $(UTILS.DOM_ELS.book).width();
      const columnsGap = UTILS.extractComputedStyleNumber(
        UTILS.DOM_ELS.book,
        "column-gap"
      );
      const x = (columnWidth + columnsGap) * this.currentPage;
      UTILS.DOM_ELS.book.scrollTo(-x, 0);

      // Scrolling in the hidden book
      if (this.allBookTitles) {
        const currentChapter = this.allBookTitles[this.currentChapterIndex];
        const currentChapterPos = currentChapter?.offsetLeft - x;
        UTILS.DOM_ELS.demoBook?.scrollTo(currentChapterPos, 0);
        this.updatePagesCount();
      }
    }

    updatePagesCount() {
      this.userPreferences = new UserPreferences(this.bookId);
      const wholeBook = UTILS.DOM_ELS.demoBook;
      const columnWidth = $(UTILS.DOM_ELS.book).width();
      const columnsGap = UTILS.extractComputedStyleNumber(
        UTILS.DOM_ELS.book,
        "column-gap"
      );
      const currentPage = Math.abs(
        wholeBook?.scrollLeft / (columnWidth + columnsGap)
      );
      const pagesNo = wholeBook?.scrollWidth / (columnWidth + columnsGap);
      UTILS.DOM_ELS.currentPageOfAllPages.textContent = (
        currentPage + 1
      ).toFixed(0);
      UTILS.DOM_ELS.percent.querySelector("span").style.width =
        ((currentPage + 1) / pagesNo) * 100 + "%";
      UTILS.DOM_ELS.allPages.textContent = Math.round(pagesNo);
    }

    changeChapter(mode) {
      const oldChapterIndex = this.currentChapterIndex;
      switch (mode) {
        case "next":
          if (!this.isLastChapter) {
            this.currentChapterIndex++;
            this.currentPage = 0;
          }
          break;
        case "prev":
          if (!this.isFirstChapter && this.isFirstPage)
            this.currentChapterIndex--;
          else if (!this.isFirstPage) this.currentPage = 0;
          break;
        case "first":
          this.currentChapterIndex = 0;
          this.currentPage = 0;
          break;
        case "last":
          this.currentChapterIndex = this.chapters.length - 1;
          this.currentPage = 0;
          break;
        default:
          break;
      }
      //render the new chapter
      if (oldChapterIndex !== this.currentChapterIndex)
        this.currentChapter = new BookChapter(
          this.chapters[
            Math.min(this.currentChapterIndex, this.chapters.length - 1)
          ],
          this.bookId
        );
      this.changePage();
    }

    matchPageControlsWithState() {
      if (
        UTILS.DOM_ELS.prevChapterBtn &&
        UTILS.DOM_ELS.nextChapterBtn &&
        UTILS.DOM_ELS.prevPageBtn &&
        UTILS.DOM_ELS.nextPageBtn
      ) {
        //if it's only one or chapter less and one page or less
        //if it's only one or chapter less and one page or less
        //if it's only one or chapter less and one page or less
        if (UTILS.calcPageCount() < 2 && this.chapters.length < 2) {
          UTILS.DOM_ELS.prevChapterBtn.disabled = true;
          UTILS.DOM_ELS.nextChapterBtn.disabled = true;
          UTILS.DOM_ELS.prevPageBtn.disabled = true;
          UTILS.DOM_ELS.nextPageBtn.disabled = true;
        } else if (this.isFirstPage && this.isFirstChapter) {
          UTILS.DOM_ELS.prevChapterBtn.disabled = true;
          UTILS.DOM_ELS.nextChapterBtn.disabled = false;
          UTILS.DOM_ELS.prevPageBtn.disabled = true;
          UTILS.DOM_ELS.nextPageBtn.disabled = false;
        } else if (this.isLastPage && this.isLastChapter) {
          UTILS.DOM_ELS.prevChapterBtn.disabled = false;
          UTILS.DOM_ELS.nextChapterBtn.disabled = true;
          UTILS.DOM_ELS.prevPageBtn.disabled = false;
          UTILS.DOM_ELS.nextPageBtn.disabled = true;
        } else {
          UTILS.DOM_ELS.prevChapterBtn.disabled = false;
          UTILS.DOM_ELS.nextChapterBtn.disabled = false;
          UTILS.DOM_ELS.prevPageBtn.disabled = false;
          UTILS.DOM_ELS.nextPageBtn.disabled = false;
        }
        if (this.isLastChapter) UTILS.DOM_ELS.nextChapterBtn.disabled = true;
      }
    }

    changePage(mode) {
      //increment or decrement the current page
      switch (mode) {
        case "next":
          if (!this.isLastPage) this.currentPage++;
          else if (this.isLastPage && !this.isLastChapter)
            this.changeChapter("next");
          break;
        case "prev":
          if (!this.isFirstPage) this.currentPage--;
          else if (this.isFirstPage && !this.isFirstChapter) {
            //go to prev chapter last page
            this.changeChapter("prev");
            this.currentPage = UTILS.calcPageCount() - 1;
          }
          break;
        case "first":
          this.currentPage = 0;
          break;
        case "last":
          this.currentPage = UTILS.calcPageCount() - 1;
          break;
        default:
          break;
      }
      //Update the state of chapter and page
      this.updateChapterPageState();
      //scroll to the current page
      this.scrollToCurrentPage();
      //disable or enable the pagination controls
      this.matchPageControlsWithState();
    }

    changeFontSize = (mode) => {
      const fontStepPx = this.fontSizeStep * this.rootFontSize;
      switch (mode) {
        case "bigger":
          if (this.canIncreaseFont) {
            this.fontSize = this.fontSize + fontStepPx;
            document.body.style.fontSize = this.fontSize + "px";
          }
          break;
        case "smaller":
          if (this.canDecreaseFont) {
            this.fontSize = this.fontSize - fontStepPx;
            document.body.style.fontSize = this.fontSize + "px";
          }
          break;
        case "reset":
          this.fontSize = this.rootFontSize;
          document.body.style.fontSize = "";
        default:
          document.body.style.fontSize = this.fontSize + "px";
          break;
      }
      this.updateFontIncreaseDecreaseState();
    };

    changeDarkMode(isDarkMode) {
      if (UTILS.DOM_ELS.darkModeChk) {
        //if there was a checkbox for dark mode, fallback to its value if nothing was inputted to the function
        this.isDarkMode = isDarkMode ?? UTILS.DOM_ELS.darkModeChk?.checked;
        UTILS.DOM_ELS.darkModeChk.checked = this.isDarkMode;
      } else {
        //if there is no checkbox and nothing was inputted fallback to the old dark mode state
        this.isDarkMode = isDarkMode ?? this.isDarkMode;
      }

      if (this.isDarkMode) {
        document.body.classList.remove("darkmode");
        document.body.classList.add("darkmode");
      } else {
        document.body.classList.remove("darkmode");
      }
    }
    changeColorMode(colorMode) {
      this.colorMode = colorMode;
      document.body.classList = this.colorMode;
      document
        .querySelector(`[data-value=${colorMode}]`)
        ?.classList.add("selected");
    }
  }
  const controller = new Controller();
  controller.initWithBookId("26dd5f00-0c75-4367-adea-537ece731385");
})();

// Dropdown Menu
initDropdowns();
function initDropdowns() {
  $(".dropdown-toggle").each(function () {
    const dropdownToggle = $(this);
    const dropdownContainer = dropdownToggle.closest(".dropdown");
    dropdownToggle.on("click", function () {
      _showDropdownMenu(dropdownContainer);
    });
  });
}

function _showDropdownMenu(dropdownContainer) {
  if (dropdownContainer.hasClass("show")) {
    dropdownContainer.removeClass("show");
    return;
  }
  $(".dropdown").removeClass("show");
  dropdownContainer.addClass("show");
}

$(document).keydown(function (e) {
  if (e.keyCode == 27) {
    $(".dropdown").removeClass("show");
    $(".actions-menu").remove();
    $(".bottom-bar").slideUp();
  }
});
$("body").click(function () {
  $(".actions-menu").remove();
  $(".dropdown").removeClass("show");
  $(".bottom-bar").slideToggle();
});
$(".dropdown,  .bottom-bar").click(function (e) {
  e.stopPropagation();
});
