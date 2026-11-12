# pi-superspec

[English](README.md) | Tiếng Việt

## Giới thiệu

pi-superspec là một pi package đưa workflow Superspec vào pi: các change theo hướng spec-driven do OpenSpec quản lý, còn các skill của Superpowers đảm nhận brainstorming, lập kế hoạch, triển khai và review. Package đi kèm schema `superspec` của OpenSpec, hai lệnh `/opsx-init` và `/opsx-generate-specs`, cùng các quy tắc workflow (`workflow.md`) điều chỉnh stock skill của chính OpenSpec cho Superspec. Bạn chạy các bước workflow bằng chính các stock skill đó (`/skill:openspec-new-change`, v.v.) hoặc nhờ agent.

Trong một repository mới chỉ có `/opsx-init`. Khi project đã được khởi tạo, `/opsx-generate-specs` sẽ tự xuất hiện.

## Yêu cầu

Bạn tự cài các dependency; package không cài chúng.

- OpenSpec 2.0 trở lên ([Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)), với profile tùy chỉnh chọn tám workflow. Chạy `openspec config profile` và chọn `explore`, `new`, `continue`, `ff`, `apply`, `verify`, `sync` và `archive`. Mỗi bước workflow chạy stock skill OpenSpec cùng workflow từ `.agents/skills/` (ví dụ `openspec-ff-change` cho ff). `openspec update` theo profile và gỡ các workflow không được chọn, nên hãy giữ cả tám.
- Các stock skill `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` và `openspec-onboard` không thuộc workflow này. Chúng không bị gỡ; hãy dùng workflow skill tương ứng, ví dụ `openspec-ff-change` cho ff hoặc `openspec-new-change` để bắt đầu một change.
- [Superpowers](https://github.com/obra/superpowers) cho pi.
- Một skill `coding-standards` do bạn tự viết hoặc cài, đặt ở `~/.agents/skills/` hoặc `.agents/skills/` của project. Implementer và các reviewer đi kèm áp dụng nó. Nếu thiếu, chúng dùng convention của project và workflow không dừng; pi hiện cảnh báo khi bắt đầu session.
- pi, coding agent mà package này mở rộng.
- Chạy `/opsx-init` không cần Git (ngoài git repository nó chỉ cảnh báo), nhưng workflow phía sau có dùng git: `openspec-apply-change` tạo worktree và branch, còn finalize đóng branch lại.
- Finalize dùng GitHub CLI (`gh`) để phát hiện, tạo và comment trên PR. Nó là tùy chọn: nếu thiếu, finalize coi branch như chưa có PR và ghi reviewer comment là skipped hoặc failed; merge và push không bị rollback.
- Trước `openspec-apply-change`, hãy ở trên một feature branch không phải integration branch của bạn (`main` hoặc `master`). Trên integration branch, apply vẫn chạy nhưng kèm cảnh báo, và phần closeout phía git của finalize không tạo ra PR dùng được, nên bạn phải dùng cách thủ công `finishing-a-development-branch` (escape hatch).
- Finalize push feature branch bằng `git push origin`, nên repository cần có remote `origin` mà bạn push được.

## Cài đặt

Cài theo đúng thứ tự này. Đừng bỏ qua hai bước đầu.

```sh
brew install openspec
pi install git:github.com/obra/superpowers
```

Các pi package tùy chọn, kèm phương án thay thế khi chúng không có:

| Package | Bổ sung | Phương án thay thế khi không có |
|---|---|---|
| `@tintinweb/pi-subagents` (khuyến nghị) | tool `Agent`, giúp `openspec-apply-change` chạy các task bằng subagent-driven development, song song theo lane khi các task độc lập; agent đi kèm được cấp cho nó (xem [Tích hợp subagent tùy chọn](#tích-hợp-subagent-tùy-chọn)) | Superpowers `executing-plans` trong session hiện tại |
| `pi-subagents` | tool `subagent`, hỗ trợ workflow tương tự; agent đi kèm được cấp cho nó | Superpowers `executing-plans` trong session hiện tại |
| `@gotgenes/pi-subagents` | tool `subagent`; nó không nhận agent đi kèm và chỉ dùng agent riêng của nó | Superpowers `executing-plans` trong session hiện tại |
| `rpiv-ask-user-question` | tool `ask_user_question` để chọn giữa các lựa chọn | một câu hỏi thường với các lựa chọn đánh số |
| `rpiv-todo` | tool `todo` để theo dõi tiến độ | một checklist được nêu trong câu trả lời của agent |
| Plannotator (tool Inbox `plannotator_inbox`, tool `plannotator` hoặc CLI) | review gate và câu hỏi qua Plannotator Inbox hoặc giao diện review; extension chọn kênh khả dụng đầu tiên (xem [hướng dẫn sử dụng](docs/usage-guide.md); có cả cách bật tool Inbox) | `ask_user_question`, rồi văn bản thường với các lựa chọn đánh số |

Cài chúng bằng `pi install` theo hướng dẫn riêng của từng package. Sau đó cài package này:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Tích hợp subagent tùy chọn

Package đi kèm sáu agent definition trong `agents/`, được khai báo cho `@tintinweb/pi-subagents` và `pi-subagents` qua các khóa manifest `pi-subagents.agents` và `pi.subagents.agents`. `@gotgenes/pi-subagents` cũng được hỗ trợ, nhưng không nhận agent đi kèm và workflow chỉ dùng agent riêng của nó. Tích hợp này là tùy chọn: extension phát hiện plugin đang hoạt động và chỉ cho agent cách ủy quyền; không có plugin subagent, mọi workflow vẫn giữ đường chạy inline.

Workflow yêu cầu role, không yêu cầu tên agent. Các ứng viên đi kèm là `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer` và `superspec.verifier`. Chúng cùng tồn tại với các agent generic và không phải bản sao của chúng.

- **Hiển thị so với routing.** Khi package đã cài, sáu role hiển thị trên toàn package với các plugin đọc manifest. Workflow chỉ route tới chúng khi một stage Superspec đang hoạt động (ví dụ `openspec-apply-change`, `openspec-verify-change`, `/opsx-generate-specs`); chỉ hiển thị thì không ủy quyền gì.
- **Quyền sở hữu cấu hình.** Bạn sở hữu các override của agent (file agent ở user hoặc project) và model mà chúng dùng, lấy từ settings của pi và pi-subagents. Package không đặt model theo từng lần gọi, không ghi settings và không tạo bản sao agent.
- **Sau khi cập nhật package.** Reload hoặc restart pi để definition mới được phát hiện. Không cần cài lại schema: agent không thuộc schema đã copy, và không chạy lại `/opsx-init`.
- **Vắng mặt so với không tương thích.** Chỉ khi đoạn Subagent integration báo rằng ủy quyền không khả dụng thì stage mới thông báo phương án inline một lần rồi chạy tiếp inline. Nếu chỉ có helper kích hoạt, stage kích hoạt nó rồi đánh giá lại ở lượt kế tiếp. Nếu tích hợp có mặt nhưng không tương thích, hoặc một role bị vô hiệu hóa, thiếu hay chạy lỗi, stage báo lại và dừng. Nó không bao giờ lặng lẽ chuyển sang agent generic, CLI hay làm inline.
- **Gỡ bỏ.** Gỡ package sẽ gỡ sáu role khỏi việc phát hiện. Không có bản sao nào trong thư mục user hay project của bạn cần dọn.
- **Bản đã kiểm thử.** `pi-subagents` 0.84.0 tại commit `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c` đã được smoke test; `@tintinweb/pi-subagents` và `@gotgenes/pi-subagents` chỉ được xem xét (inspect) (xem [docs/architecture.md](docs/architecture.md#subagent-compatibility), chỉ có tiếng Anh). Đây là các bản tham chiếu, không phải phiên bản tối thiểu đã được chứng minh. Quy trình smoke runtime nằm trong [docs/e2e-checklist.md](docs/e2e-checklist.md) (chỉ có tiếng Anh); kết quả chạy không được ghi ở đây.
- **Shell allowlist.** Khi một role giới hạn lệnh shell bằng allowlist, đó là rào chắn về những gì agent được chỉ dẫn và cho phép chạy, không phải sandbox. Đừng dựa vào nó để cô lập code không tin cậy.

## Bắt đầu nhanh

Chạy lần lượt các bước sau trong repository của bạn. Mỗi bước workflow là một stock skill của OpenSpec: chạy bằng `/skill:<id>` hoặc nhờ agent bằng lời thường ("tạo change tên add-user-auth"). Các skill lập kế hoạch sẽ dừng lại để bạn review trước bước kế tiếp.

1. `/opsx-init`: cài schema đi kèm vào `openspec/schemas/superspec/`, đặt `schema: superspec` trong `openspec/config.yaml`, validate và tự reload pi. Cần OpenSpec 2.0 trở lên. Nếu thiếu tám stock skill trong `.agents/skills/`, nó kiểm tra profile OpenSpec, dừng kèm các lệnh cần chạy khi workflow chưa được chọn, và nếu không thì chạy `openspec init --tools pi` để cài chúng; hãy commit `.agents/skills/` sau đó. Nó chỉ cảnh báo nếu thư mục không phải git repository hoặc thiếu Superpowers.
2. `openspec-new-change` (`/skill:openspec-new-change <name>`): tạo change và hiển thị hướng dẫn của artifact đầu tiên. Nó không tạo artifact nào.
3. `openspec-continue-change`: tạo artifact kế tiếp, chạy một review gate cho artifact đó và, khi gate được approve, tiếp tục sang artifact kế tiếp trong cùng lần chạy. Nó dừng trước `apply` và chỉ bạn sang `openspec-apply-change`; `changes requested` thì sửa artifact và mở lại gate (không tạo artifact nào sau đó cho đến khi được approve), còn `dismissed` thì dừng và hỏi bạn trên Interaction channel cách tiếp tục. (`openspec-ff-change` tạo tất cả trong một lần; nó chạy review gate cho `brainstorm.md`, tạo phần còn lại không dừng, rồi chạy một review gate cuối.)
4. Tạo và chuyển sang một feature branch (ví dụ `feat/<name>`) nếu bạn chưa ở trên branch nào như vậy. Hãy commit output của `/opsx-init` (`openspec/config.yaml`, `openspec/schemas/superspec/` và `.agents/skills/`) lên branch đó, vì apply chỉ commit thư mục của change và worktree được tạo từ feature branch. Hãy push branch một lần bằng `git push -u origin feat/<name>`, vì finalize chạy `git pull` thường trên branch đó và lệnh này lỗi nếu branch chưa có upstream. Sau đó chạy `openspec-apply-change`. Nó tạo một worktree trên branch đặt theo tên change, triển khai các task và ghi `apply.md`.
5. `openspec-verify-change`: tự tìm worktree (`git worktree list`), nên chạy từ checkout nào cũng được; đường dẫn do apply in ra và được ghi trong `apply.md`. Nó ghi `verify.md` với `PASS`, `PASS_WITH_WARNINGS` hoặc `FAIL`. Nếu `FAIL`, chạy lại `openspec-apply-change` cho một vòng sửa lỗi.
6. Finalize: không phải một skill riêng. Sau khi verify đạt, khởi động (hoặc khởi động lại) pi với đường dẫn worktree làm thư mục làm việc, rồi chạy `openspec-continue-change` để tạo artifact `finalize`. Skill continue không tự tìm worktree: chạy từ main checkout, nó đọc bản của change trong main checkout (không có `apply.md`) nên sẽ chỉ bạn quay lại `openspec-apply-change`. Phần closeout phía git merge branch của worktree trở lại feature branch, xóa worktree (khi nó nằm dưới `.worktrees/`, `worktrees/` hoặc `~/.config/superpowers/worktrees/`) và push feature branch.
7. `openspec-archive-change`: mở lại pi trong main checkout (không phải worktree, vì finalize có thể đã xóa nó), sau finalize và trước khi PR (nếu có) được merge. Thư mục của change nằm trên feature branch sau finalize; xem guide để biết trình tự chính xác.

Hướng dẫn đầy đủ nằm trong [docs/usage-guide.md](docs/usage-guide.md) (chỉ có tiếng Anh).

## Các lệnh

Package đi kèm hai lệnh:

| Command | Chức năng |
|---|---|
| `/opsx-init` | Thiết lập repository cho workflow Superspec. Luôn khả dụng. Tùy chọn `--lang <language>` đặt ngôn ngữ của các tài liệu OpenSpec. Tùy chọn `--generate` chỉ in gợi ý chạy `/opsx-generate-specs` tiếp theo, không làm việc nào của agent. Tùy chọn `--force` thay thế schema hiện có mà `/opsx-init` nếu không sẽ giữ nguyên, sau khi sao lưu nó. |
| `/opsx-generate-specs` | Cho codebase có sẵn: map code thành các capability, hỏi bạn xác nhận một lần, rồi soạn delta spec cho từng capability trong change `bootstrap-specs`. Dừng trước `openspec-ff-change bootstrap-specs`. |

`/opsx-generate-specs` chỉ tồn tại trong một project đã khởi tạo. Các bước workflow là stock skill của OpenSpec trong `.agents/skills/`, không phải lệnh của package. Chạy từng skill bằng `/skill:<id>` hoặc nhờ agent; trước khi chạy, agent đọc phần của bước đó trong `openspec/schemas/superspec/workflow.md`, và chỗ nào file này khác stock skill thì `workflow.md` thắng.

| Bước | Stock skill | Cách chạy | Chức năng |
|---|---|---|---|
| explore | `openspec-explore` | `/skill:openspec-explore [topic]` | Khám phá ý tưởng và làm rõ yêu cầu trước hoặc trong một change. Không viết application code. |
| new | `openspec-new-change` | `/skill:openspec-new-change <name>` | Bắt đầu một change và hiển thị hướng dẫn của artifact đầu tiên. |
| continue | `openspec-continue-change` | `/skill:openspec-continue-change [name]` | Tạo artifact kế tiếp, chạy review gate cho nó và, khi được approve, tiếp tục sang artifact kế tiếp. Dừng trước apply. |
| ff | `openspec-ff-change` | `/skill:openspec-ff-change <name>` | Brainstorm tương tác và chạy review gate cho `brainstorm.md`, tạo mọi artifact cần để triển khai, rồi chạy một review gate cuối. Dừng trước apply. |
| apply | `openspec-apply-change` | `/skill:openspec-apply-change [name]` | Triển khai change trong một worktree và ghi `apply.md`. |
| verify | `openspec-verify-change` | `/skill:openspec-verify-change [name]` | Verify change đã apply và ghi `verify.md`. |
| sync | `openspec-sync-specs` | `/skill:openspec-sync-specs [name]` | Merge delta spec vào `openspec/specs/` mà không archive. |
| archive | `openspec-archive-change` | `/skill:openspec-archive-change [name]` | Sync nếu cần, rồi archive một change đã hoàn thành. |

pi liệt kê lệnh `/skill:<id>` cho mỗi skill trong phần gợi ý lệnh tương tác khi setting `enableSkillCommands` đang bật (mặc định); khi tắt, lệnh `/skill:<id>` gõ tay vẫn chạy được, và bạn luôn có thể nhờ agent chạy bước đó. Các phiên bản package trước có một lệnh `/opsx-<step>` cho mỗi bước; các lệnh đó đã bị gỡ. Các lệnh `opsx-propose` và `opsx-bulk-archive` không được đi kèm, và bốn stock skill không dùng nêu ở phần Yêu cầu không thuộc workflow.

Hai thứ nâng cấp riêng: `openspec update` nâng cấp các stock skill; cập nhật package rồi chạy `/opsx-init` nâng cấp schema và `workflow.md`.

Nếu `openspec/schemas/superspec/` đã tồn tại và khác với schema đi kèm, `/opsx-init` xử lý như sau. Nếu nó cũ hơn và chưa bị sửa kể từ lúc cài (lock file `.pi-superspec.json` khớp với các file), `/opsx-init` hỏi bạn xác nhận rồi thay bằng schema đi kèm; hãy commit `openspec/schemas/superspec/` sau đó. Không có UI tương tác thì nó chỉ báo cần làm gì. Schema có chỉnh sửa cục bộ, schema mới hơn hoặc schema lạ được giữ nguyên kèm cảnh báo, và chỉ bị thay khi dùng `/opsx-init --force`, lệnh này trước tiên sao chép thư mục hiện có vào `~/.pi/superspec-backups/`. Khi bắt đầu session, schema cũ hoặc đã bị sửa hiện một dòng thông báo; không có gì được ghi cho đến khi bạn chạy `/opsx-init`.

## Gỡ cài đặt

Gỡ package sẽ gỡ `/opsx-init`, `/opsx-generate-specs` và skill `opsx-generate-specs`. Thư mục `openspec/` của bạn vẫn là một project OpenSpec hợp lệ, với các change, archive và spec. Những file sau vẫn còn lại, và bạn có thể xóa chúng:

- `openspec/schemas/superspec/` (schema đã được copy) và lock file của nó `openspec/schemas/superspec/.pi-superspec.json`.
- dòng `schema: superspec` trong `openspec/config.yaml`.
- các stock skill OpenSpec trong `.agents/skills/`; chúng thuộc về OpenSpec và còn lại cho đến khi bạn xóa (hoặc `openspec update` xóa sau khi đổi profile).

Package không ghi gì dưới `.pi/`. Cài lại package sẽ kích hoạt lại project, vì schema marker vẫn còn.

## Ghi công và giấy phép

- [Superspec](https://github.com/danielhanold/superspec) của Daniel Hanold, mà package này điều chỉnh cho pi.
- [JiangWay `sdd-plus-superpowers`](https://github.com/JiangWay/OpenSpec/tree/main/schemas/sdd-plus-superpowers), nguồn gốc của Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) của Fission AI.

Giấy phép MIT. Xem [LICENSE](LICENSE).
