import ModuleService from "./module.service";
import RecordsService from "./records.service";
import ViewsService from "./views.service";

export type {
    CreateRecordModuleInput,
    RecordPageQuery,
    RecordRelationshipInput,
    RecordValueInput,
    UpdateRecordModuleInput,
} from "./types";

const RecordModuleService = {
    ...RecordsService,
    ...ViewsService,
    ...ModuleService,
};

export default RecordModuleService;