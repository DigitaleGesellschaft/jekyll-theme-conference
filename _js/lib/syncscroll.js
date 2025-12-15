/**
 * @fileoverview syncscroll - scroll several areas simultaneously
 * @version 0.0.2
 *
 * @license MIT, see http://github.com/asvd/intence
 * @copyright 2015 asvd <heliosframework@gmail.com>
 *
 * Converted to ES module for use with Vite
 */

const Width = 'Width';
const Height = 'Height';
const Top = 'Top';
const Left = 'Left';
const scroll = 'scroll';
const client = 'client';
let names = [];

export function reset() {
  const elems = document.getElementsByClassName('syncscroll');
  let i, j, el, found, name;

  for (name in names) {
    if (Object.prototype.hasOwnProperty.call(names, name)) {
      for (i = 0; i < names[name].length; i++) {
        names[name][i].removeEventListener(
          'scroll', names[name][i].syn, 0
        );
      }
    }
  }

  for (i = 0; i < elems.length; i++) {
    found = 0;
    el = elems[i];
    if (!(name = el.getAttribute('name'))) {
      continue;
    }

    el = el.scroller || el;

    if (!names[name]) {
      names[name] = [];
    }

    for (j = 0; j < names[name].length; j++) {
      if (names[name][j] == el) {
        found = 1;
      }
    }

    if (!found) {
      names[name].push(el);
    }

    el.eX = el.eY = 0;

    (function(el, name) {
      el.addEventListener(
        'scroll',
        el.syn = function() {
          const elems = names[name];

          const scrollX = el[scroll + Left];
          const scrollY = el[scroll + Top];

          const xRate =
            scrollX /
            (el[scroll + Width] - el[client + Width]);
          const yRate =
            scrollY /
            (el[scroll + Height] - el[client + Height]);

          let updateX = 0;
          let updateY = 0;

          let otherEl, i;

          if (scrollX != el.eX) {
            updateX = 1;
            el.eX = scrollX;
          }

          if (scrollY != el.eY) {
            updateY = 1;
            el.eY = scrollY;
          }

          for (i = 0; i < elems.length; i++) {
            otherEl = elems[i];
            if (otherEl != el) {
              if (updateX) {
                const newScrollX = Math.round(
                  xRate *
                  (otherEl[scroll + Width] -
                    otherEl[client + Width])
                );

                otherEl.eX =
                  otherEl[scroll + Left] = newScrollX;
              }

              if (updateY) {
                const newScrollY = Math.round(
                  yRate *
                  (otherEl[scroll + Height] -
                    otherEl[client + Height])
                );

                otherEl.eY =
                  otherEl[scroll + Top] = newScrollY;
              }
            }
          }
        }, 0
      );
    })(el, name);
  }
}

// Auto-initialize on load
export function init() {
  if (document.readyState == "complete") {
    reset();
  } else {
    window.addEventListener("load", reset, 0);
  }
}

// Export for global access
export default {
  reset,
  init
};

