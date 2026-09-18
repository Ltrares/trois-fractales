// The "Code source" link in the pause menu.
//
// The pause overlay resumes the game on click. The link lives inside it, so
// without this the browser would open the repo *and* the game would unpause
// behind it - the player comes back to a moving camera. Same reason the
// language toggle stops its own click (see i18n/lang-toggle.js).

export function initRepoLink(root = document) {
    const link = root.getElementById
        ? root.getElementById('repo-link')
        : root.querySelector('#repo-link');
    if (!link) return;

    link.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
